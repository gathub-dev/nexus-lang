/**
 * Nexus Migration Engine
 *
 * Fluxo:
 * 1. Lê schema atual do banco (introspection)
 * 2. Compara com AST do .nexus
 * 3. Gera plano de migração (diff)
 * 4. Executa as alterações em transação
 * 5. Salva histórico na tabela _nexus_migrations
 */

import { ValidationError } from './validator.js'

// ------------------------------------------------------------
// Tipos de operação de migração
// ------------------------------------------------------------

/**
 * @typedef {'create_table'|'add_column'|'alter_column'|'add_unique'|'add_fk'|'rename_table'} MigrationOp
 *
 * @typedef {Object} MigrationStep
 * @property {MigrationOp} op
 * @property {string} table
 * @property {string} [column]
 * @property {string} sql
 * @property {boolean} [destructive] - true se pode causar perda de dados
 * @property {string} [warning]
 */

// ------------------------------------------------------------
// Introspection — lê estado atual do banco
// ------------------------------------------------------------

/**
 * Retorna mapa de tabelas e colunas existentes no banco
 * @param {import('pg').Client} db
 * @returns {Promise<Map<string, Map<string, object>>>}
 */
async function introspectDB(db) {
  const tables = new Map()

  const tablesResult = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name NOT LIKE '_nexus_%'
    ORDER BY table_name
  `)

  for (const row of tablesResult.rows) {
    const tableName = row.table_name
    const columns = new Map()

    const colsResult = await db.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName])

    for (const col of colsResult.rows) {
      columns.set(col.column_name, {
        name: col.column_name,
        dataType: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
      })
    }

    // unique constraints
    const uniqueResult = await db.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
    `, [tableName])

    const uniqueCols = new Set(uniqueResult.rows.map(r => r.column_name))

    for (const [name, col] of columns) {
      col.unique = uniqueCols.has(name)
    }

    tables.set(tableName, columns)
  }

  return tables
}

// ------------------------------------------------------------
// Geração de SQL por tipo de campo
// ------------------------------------------------------------

// Quota nomes de tabela para evitar conflito com palavras reservadas (user, order, etc)
function qt(name) {
  return `"${name}"`
}

function fieldTypeToSQL(field) {
  if (field.type === 'number') return 'INTEGER'
  if (field.type === 'boolean') return 'BOOLEAN'
  if (field.type === 'relation') return 'INTEGER'
  return 'TEXT'
}

function fieldColumnName(field) {
  return field.type === 'relation' ? `${field.name}_id` : field.name
}

// ------------------------------------------------------------
// Diff — compara AST vs banco
// ------------------------------------------------------------

/**
 * @param {import('./parser.js').NexusAST} ast
 * @param {Map<string, Map<string, object>>} dbState
 * @returns {MigrationStep[]}
 */
export function diffSchema(ast, dbState) {
  const steps = []

  for (const entity of ast.entities) {
    const tableName = entity.name.toLowerCase()
    const dbTable = dbState.get(tableName)

    if (!dbTable) {
      // tabela nova — CREATE TABLE completo
      steps.push(buildCreateTable(entity))
      continue
    }

    // tabela existe — verificar colunas
    for (const field of entity.fields) {
      const colName = fieldColumnName(field)
      const dbCol = dbTable.get(colName)

      if (!dbCol) {
        // coluna nova — ADD COLUMN
        steps.push(buildAddColumn(tableName, field))
        continue
      }

      // coluna existe — verificar unique
      if (field.unique && !dbCol.unique) {
        steps.push({
          op: 'add_unique',
          table: tableName,
          column: colName,
          sql: `ALTER TABLE ${qt(tableName)} ADD CONSTRAINT ${tableName}_${colName}_unique UNIQUE (${colName})`,
        })
      }

      // verificar NOT NULL — só adiciona, nunca remove (seguro)
      if (field.required && dbCol.nullable) {
        steps.push({
          op: 'alter_column',
          table: tableName,
          column: colName,
          sql: `ALTER TABLE ${qt(tableName)} ALTER COLUMN ${colName} SET NOT NULL`,
          destructive: true,
          warning: `Adicionando NOT NULL em "${tableName}.${colName}" — garanta que não existem NULLs antes de migrar`,
        })
      }

      // FK para relações novas
      if (field.type === 'relation') {
        steps.push(...buildFKIfMissing(tableName, field, dbTable))
      }
    }
  }

  return steps
}

function buildCreateTable(entity) {
  const fields = entity.fields.map(field => {
    const colName = fieldColumnName(field)
    const sqlType = fieldTypeToSQL(field)
    const notNull = field.required ? ' NOT NULL' : ''
    const unique = field.unique ? ' UNIQUE' : ''

    if (field.type === 'relation') {
      return `${colName} INTEGER${notNull} REFERENCES ${qt(field.relation.toLowerCase())}(id)`
    }
    if (field.type === 'enum') {
      const vals = field.enumValues.map(v => `'${v}'`).join(', ')
      return `${colName} TEXT CHECK (${colName} IN (${vals}))${notNull}`
    }

    return `${colName} ${sqlType}${unique}${notNull}`
  }).join(',\n  ')

  const tbl = entity.name.toLowerCase()
  return {
    op: 'create_table',
    table: tbl,
    sql: `
CREATE TABLE IF NOT EXISTS ${qt(tbl)} (
  id SERIAL PRIMARY KEY,
  ${fields},
  created_at TIMESTAMPTZ DEFAULT NOW()
)`.trim(),
  }
}

function buildAddColumn(tableName, field) {
  const colName = fieldColumnName(field)
  const sqlType = fieldTypeToSQL(field)

  let definition = `${colName} ${sqlType}`

  if (field.type === 'enum') {
    const vals = field.enumValues.map(v => `'${v}'`).join(', ')
    definition = `${colName} TEXT CHECK (${colName} IN (${vals}))`
  }

  if (field.type === 'relation') {
    definition = `${colName} INTEGER REFERENCES ${qt(field.relation.toLowerCase())}(id)`
  }

  return {
    op: 'add_column',
    table: tableName,
    column: colName,
    sql: `ALTER TABLE ${qt(tableName)} ADD COLUMN IF NOT EXISTS ${definition}${field.required && field.type === 'text' ? " DEFAULT ''" : ''}`,
    destructive: false,
  }
}

function buildFKIfMissing(tableName, field, dbTable) {
  const steps = []
  const colName = fieldColumnName(field)

  steps.push({
    op: 'add_fk',
    table: tableName,
    column: colName,
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = '${tableName}'
      AND kcu.column_name = '${colName}'
  ) THEN
    ALTER TABLE ${qt(tableName)}
      ADD CONSTRAINT fk_${tableName}_${colName}
      FOREIGN KEY (${colName}) REFERENCES ${qt(field.relation.toLowerCase())}(id);
  END IF;
END
$$`.trim(),
  })

  return steps
}

// ------------------------------------------------------------
// Execução da migração
// ------------------------------------------------------------

/**
 * Executa o plano de migração em transação
 * @param {MigrationStep[]} steps
 * @param {import('pg').Client} db
 * @param {{ dryRun?: boolean }} options
 */
export async function runMigration(steps, db, { dryRun = false } = {}) {
  if (steps.length === 0) {
    console.log('[nexus:migrate] schema em dia — nenhuma alteração necessária')
    return { applied: 0, steps: [] }
  }

  const destructive = steps.filter(s => s.destructive)
  if (destructive.length > 0) {
    console.warn('[nexus:migrate] ATENÇÃO — operações destrutivas detectadas:')
    for (const s of destructive) {
      console.warn(`  ! ${s.warning ?? s.sql}`)
    }
  }

  if (dryRun) {
    console.log('[nexus:migrate] DRY RUN — nenhuma alteração aplicada')
    console.log('\nPlano de migração:')
    for (const step of steps) {
      console.log(`\n[${step.op}] ${step.table}${step.column ? `.${step.column}` : ''}`)
      console.log(step.sql)
    }
    return { applied: 0, steps, dryRun: true }
  }

  // executa em transação
  await db.query('BEGIN')

  try {
    await ensureMigrationsTable(db)

    const migrationId = `migration_${Date.now()}`
    const applied = []

    for (const step of steps) {
      console.log(`[nexus:migrate] ${step.op}: ${step.table}${step.column ? `.${step.column}` : ''}`)
      await db.query(step.sql)
      applied.push(step)
    }

    // salva registro da migração
    await db.query(
      `INSERT INTO _nexus_migrations (id, steps, applied_at) VALUES ($1, $2, NOW())`,
      [migrationId, JSON.stringify(applied)]
    )

    await db.query('COMMIT')
    console.log(`[nexus:migrate] ${applied.length} alterações aplicadas`)

    return { applied: applied.length, steps: applied }
  } catch (err) {
    await db.query('ROLLBACK')
    throw new Error(`[nexus:migrate] falhou e reverteu: ${err.message}`)
  }
}

async function ensureMigrationsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS _nexus_migrations (
      id TEXT PRIMARY KEY,
      steps JSONB NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

/**
 * Ponto de entrada principal da migração
 * @param {import('./parser.js').NexusAST} ast
 * @param {import('pg').Client} db
 * @param {{ dryRun?: boolean }} options
 */
export async function migrate(ast, db, options = {}) {
  const dbState = await introspectDB(db)
  const steps = diffSchema(ast, dbState)
  return runMigration(steps, db, options)
}
