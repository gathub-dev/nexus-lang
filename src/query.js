/**
 * Nexus Query Engine
 * Parseia queries em linguagem natural para SQL seguro
 *
 * Sintaxe:
 *   find <entity> [where <field> <op> <value> [and ...]] [order by <field> [asc|desc]] [limit <n>]
 *
 * Operadores: =, !=, >, <, >=, <=, like, in
 */

import { ValidationError } from './validator.js'

const SAFE_FIELD = /^[a-zA-Z][a-zA-Z0-9_]*$/
const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 100

const OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=', 'like', 'in'])

/**
 * @typedef {Object} ParsedQuery
 * @property {string} entity
 * @property {Array<{field: string, op: string, value: string|number}>} conditions
 * @property {string|null} orderBy
 * @property {'asc'|'desc'} orderDir
 * @property {number} limit
 */

/**
 * Parseia uma query nexus
 * @param {string} input - ex: "find users where role = admin order by name asc limit 20"
 * @returns {ParsedQuery}
 */
export function parseQuery(input) {
  const raw = input.trim().toLowerCase()

  if (!raw.startsWith('find ')) {
    throw new ValidationError('Query deve começar com "find"')
  }

  const tokens = tokenize(raw.slice(5)) // remove "find "

  if (tokens.length === 0) {
    throw new ValidationError('Especifique a entidade: "find users"')
  }

  const entity = tokens.shift()
  if (!SAFE_FIELD.test(entity)) {
    throw new ValidationError(`Nome de entidade inválido: "${entity}"`)
  }

  const result = {
    entity,
    conditions: [],
    orderBy: null,
    orderDir: 'asc',
    limit: DEFAULT_LIMIT,
  }

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token === 'where') {
      i++
      i = parseConditions(tokens, i, result.conditions)
      continue
    }

    if (token === 'order' && tokens[i + 1] === 'by') {
      i += 2
      if (i >= tokens.length) throw new ValidationError('Esperado campo após "order by"')

      const field = tokens[i]
      if (!SAFE_FIELD.test(field)) throw new ValidationError(`Campo inválido em order by: "${field}"`)
      result.orderBy = field
      i++

      if (i < tokens.length && (tokens[i] === 'asc' || tokens[i] === 'desc')) {
        result.orderDir = tokens[i]
        i++
      }
      continue
    }

    if (token === 'limit') {
      i++
      if (i >= tokens.length) throw new ValidationError('Esperado número após "limit"')

      const n = parseInt(tokens[i])
      if (isNaN(n) || n < 1) throw new ValidationError(`Valor de limit inválido: "${tokens[i]}"`)
      result.limit = Math.min(n, MAX_LIMIT)
      i++
      continue
    }

    // se chegou aqui e não tem where, pode ser condição direta após entity
    // ex: "find users limit 5" - ok, "find users blabla" - erro
    throw new ValidationError(`Token inesperado: "${token}"`)
  }

  return result
}

function tokenize(input) {
  // preserva operadores multi-char como >= e !=
  const normalized = input
    .replace(/!=/g, ' != ')
    .replace(/>=/g, ' >= ')
    .replace(/<=/g, ' <= ')
    .replace(/([^!><=])=/g, '$1 = ')
    .replace(/([^!><=])>/g, '$1 > ')
    .replace(/([^!><=])</g, '$1 < ')

  return normalized.split(/\s+/).filter(Boolean)
}

function parseConditions(tokens, i, conditions) {
  while (i < tokens.length) {
    // parar se encontrar order ou limit
    if (tokens[i] === 'order' || tokens[i] === 'limit') break

    const field = tokens[i]
    if (!SAFE_FIELD.test(field)) throw new ValidationError(`Campo inválido: "${field}"`)
    i++

    if (i >= tokens.length) throw new ValidationError(`Esperado operador após "${field}"`)
    const op = tokens[i]
    if (!OPERATORS.has(op)) throw new ValidationError(`Operador inválido: "${op}" — use: =, !=, >, <, >=, <=, like`)
    i++

    if (i >= tokens.length) throw new ValidationError(`Esperado valor após "${field} ${op}"`)
    const value = parseValue(tokens[i])
    i++

    conditions.push({ field, op, value })

    // consumir "and" se existir
    if (i < tokens.length && tokens[i] === 'and') {
      i++
    }
  }

  return i
}

function parseValue(token) {
  // número
  const num = Number(token)
  if (!isNaN(num)) return num

  // booleano
  if (token === 'true') return true
  if (token === 'false') return false
  if (token === 'null') return null

  // string (remove aspas se tiver)
  return token.replace(/^['"]|['"]$/g, '')
}

/**
 * Converte ParsedQuery em SQL parametrizado seguro
 * @param {ParsedQuery} query
 * @param {import('./parser.js').NexusAST} ast - para validar entidade/campos
 * @returns {{ sql: string, params: any[] }}
 */
export function buildSQL(query, ast) {
  // validar que entidade existe (aceita plural e lowercase)
  const q = query.entity.toLowerCase()
  const entity = ast.entities.find(e => {
    const name = e.name.toLowerCase()
    return name === q || name + 's' === q || name + 'es' === q || q + 's' === name
  })
  if (!entity) {
    throw new ValidationError(`Entidade "${query.entity}" não existe no schema`)
  }

  const tableName = entity.name.toLowerCase()
  const allowedFields = new Set([
    'id', 'created_at',
    ...entity.fields.map(f => f.type === 'relation' ? `${f.name}_id` : f.name)
  ])

  let sql = `SELECT * FROM "${tableName}"`
  const params = []
  let paramIndex = 1

  // WHERE
  if (query.conditions.length > 0) {
    const clauses = []

    for (const cond of query.conditions) {
      if (!allowedFields.has(cond.field)) {
        throw new ValidationError(`Campo "${cond.field}" não existe em "${entity.name}"`)
      }

      if (cond.value === null) {
        clauses.push(cond.op === '=' ? `${cond.field} IS NULL` : `${cond.field} IS NOT NULL`)
      } else if (cond.op === 'like') {
        params.push(`%${cond.value}%`)
        clauses.push(`${cond.field} ILIKE $${paramIndex++}`)
      } else {
        params.push(cond.value)
        clauses.push(`${cond.field} ${cond.op} $${paramIndex++}`)
      }
    }

    sql += ' WHERE ' + clauses.join(' AND ')
  }

  // ORDER BY
  if (query.orderBy) {
    if (!allowedFields.has(query.orderBy)) {
      throw new ValidationError(`Campo "${query.orderBy}" não existe em "${entity.name}"`)
    }
    sql += ` ORDER BY ${query.orderBy} ${query.orderDir.toUpperCase()}`
  } else {
    sql += ' ORDER BY id DESC'
  }

  // LIMIT
  params.push(query.limit)
  sql += ` LIMIT $${paramIndex++}`

  return { sql, params }
}

/**
 * Executa uma query contra o banco
 * @param {string} input - query em linguagem nexus
 * @param {import('./parser.js').NexusAST} ast
 * @param {import('pg').Client} db
 * @returns {Promise<{ data: object[], count: number }>}
 */
export async function executeQuery(input, ast, db) {
  const parsed = parseQuery(input)
  const { sql, params } = buildSQL(parsed, ast)
  const result = await db.query(sql, params)
  return { data: result.rows, count: result.rows.length }
}
