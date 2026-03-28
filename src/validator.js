/**
 * Nexus Security Validator
 * Valida o AST antes de qualquer execução
 */

// Palavras reservadas SQL que não podem ser usadas como nomes
const SQL_RESERVED = new Set([
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate',
  'table', 'database', 'schema', 'index', 'view', 'trigger', 'function', 'procedure',
  'from', 'where', 'join', 'on', 'as', 'and', 'or', 'not', 'null', 'true', 'false',
  'primary', 'foreign', 'key', 'references', 'unique', 'default', 'constraint',
  'serial', 'integer', 'text', 'boolean', 'timestamp', 'returning',
  'pg_user', 'pg_tables', 'information_schema', 'pg_catalog',
])

// Palavras reservadas do JS/Node que não podem ser nomes de campo
const JS_RESERVED = new Set([
  '__proto__', 'constructor', 'prototype', 'toString', 'valueOf',
  'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'then', 'catch', 'finally',
])

const RESERVED = new Set([...SQL_RESERVED, ...JS_RESERVED])

// Regex: só letras e números, começa com letra, sem underscores duplos
const SAFE_IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9]*$/

export class ValidationError extends Error {
  constructor(message) {
    super(`[validation] ${message}`)
  }
}

function assertSafeIdentifier(name, context) {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new ValidationError(
      `"${name}" em ${context} contém caracteres inválidos — use apenas letras e números, começando com letra`
    )
  }
  if (RESERVED.has(name.toLowerCase())) {
    throw new ValidationError(
      `"${name}" em ${context} é uma palavra reservada — escolha outro nome`
    )
  }
}

function validateEntity(entity) {
  assertSafeIdentifier(entity.name, 'entidade')

  if (entity.fields.length === 0) {
    throw new ValidationError(`Entidade "${entity.name}" não tem campos`)
  }

  const fieldNames = new Set()
  for (const field of entity.fields) {
    assertSafeIdentifier(field.name, `campo de ${entity.name}`)

    if (fieldNames.has(field.name)) {
      throw new ValidationError(`Campo "${field.name}" duplicado em "${entity.name}"`)
    }
    fieldNames.add(field.name)

    if (field.type === 'enum' && (!field.enumValues || field.enumValues.length === 0)) {
      throw new ValidationError(`Campo enum "${field.name}" em "${entity.name}" não tem valores`)
    }

    if (field.type === 'enum') {
      for (const val of field.enumValues) {
        if (!/^[a-zA-Z0-9_-]+$/.test(val)) {
          throw new ValidationError(
            `Valor de enum "${val}" no campo "${field.name}" contém caracteres inválidos`
          )
        }
      }
    }

    if (field.type === 'relation' && !field.relation) {
      throw new ValidationError(`Campo "${field.name}" em "${entity.name}" tem relação sem entidade`)
    }
  }
}

function validateIntent(intent, entityNames) {
  if (!intent.name || intent.name.trim() === '') {
    throw new ValidationError('Intent sem nome')
  }

  if (intent.actions.length === 0) {
    throw new ValidationError(`Intent "${intent.name}" não tem ações`)
  }

  const hasSave = intent.actions.some(a => a.type === 'save')
  if (!hasSave) {
    throw new ValidationError(
      `Intent "${intent.name}" não tem ação "save" — intents de mutação devem persistir algo`
    )
  }

  for (const action of intent.actions) {
    if (action.type === 'save' && !entityNames.has(action.entity)) {
      throw new ValidationError(
        `Intent "${intent.name}" tenta salvar "${action.entity}" que não existe no schema`
      )
    }
  }
}

function validateEvent(event) {
  if (!event.name || event.name.trim() === '') {
    throw new ValidationError('Evento sem nome')
  }
  assertSafeIdentifier(event.name, 'evento')
}

function validateRelations(entities) {
  const entityNames = new Set(entities.map(e => e.name))

  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.type === 'relation' && !entityNames.has(field.relation)) {
        throw new ValidationError(
          `Campo "${field.name}" em "${entity.name}" referencia "${field.relation}" que não existe`
        )
      }
    }
  }
}

/**
 * Valida o AST completo antes de executar
 * Lança ValidationError se encontrar problema
 * @param {import('./parser.js').NexusAST} ast
 */
export function validateAST(ast) {
  const { entities, intents, events } = ast

  if (entities.length === 0) {
    throw new ValidationError('Schema não tem entidades definidas')
  }

  for (const entity of entities) {
    validateEntity(entity)
  }

  validateRelations(entities)

  const entityNames = new Set(entities.map(e => e.name))

  for (const intent of intents) {
    validateIntent(intent, entityNames)
  }

  for (const event of events) {
    validateEvent(event)
  }
}

/**
 * Sanitiza dados de entrada contra o schema da entidade
 * Remove campos não declarados, previne injection via keys extras
 * @param {Object} data - dados do request
 * @param {import('./parser.js').Entity} entity - entidade do AST
 * @returns {Object} dados sanitizados
 */
export function sanitizeInput(data, entity) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ValidationError('Body da requisição deve ser um objeto JSON')
  }

  const allowedKeys = new Set(
    entity.fields.map(f => f.type === 'relation' ? `${f.name}_id` : f.name)
  )

  const sanitized = Object.create(null) // sem prototype
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) continue
    if (JS_RESERVED.has(key)) continue
    if (!SAFE_IDENTIFIER.test(key) && !key.endsWith('_id')) continue

    const value = data[key]
    if (value === undefined || typeof value === 'function') continue

    sanitized[key] = value
  }

  return sanitized
}
