/**
 * Nexus Language Parser
 * Gera um AST completo a partir de código .nexus
 */

export class ParseError extends Error {
  constructor(message, line) {
    super(`[linha ${line}] ${message}`)
    this.line = line
  }
}

/**
 * @typedef {Object} Field
 * @property {string} name
 * @property {'text'|'number'|'boolean'|'enum'} type
 * @property {string|null} relation - nome da entidade se for relação (->)
 * @property {string[]|null} enumValues
 * @property {boolean} required
 * @property {boolean} unique
 */

/**
 * @typedef {Object} Entity
 * @property {string} name
 * @property {Field[]} fields
 */

/**
 * @typedef {Object} IntentAction
 * @property {'save'|'emit'|'require'|'validate'|'log'|'authorize'|'custom'} type
 * @property {string} [entity]
 * @property {string} [event]
 * @property {string} [message]
 * @property {string[]} [fields]
 * @property {string} [raw]
 * @property {string} [code]
 */

/**
 * @typedef {Object} Intent
 * @property {string} name
 * @property {IntentAction[]} actions
 */

/**
 * @typedef {Object} NexusEvent
 * @property {string} name
 * @property {IntentAction[]} actions
 */

/**
 * @typedef {Object} NexusAST
 * @property {Entity[]} entities
 * @property {Intent[]} intents
 * @property {NexusEvent[]} events
 */

const FIELD_TYPES = new Set(['text', 'number', 'boolean'])

function parseModifiers(tokens) {
  return {
    required: tokens.includes('required'),
    unique: tokens.includes('unique'),
  }
}

function parseField(line, lineNum) {
  const trimmed = line.trim()

  // relação: fieldName -> EntityName [modifiers]
  if (trimmed.includes('->')) {
    const [left, right] = trimmed.split('->').map(s => s.trim())
    const parts = right.split(/\s+/)
    const relation = parts[0]
    const modifiers = parseModifiers(parts.slice(1))

    if (!relation || !/^[A-Z]/.test(relation)) {
      throw new ParseError(`Relação inválida: "${trimmed}" — nome da entidade deve começar com maiúscula`, lineNum)
    }

    return {
      name: left,
      type: 'relation',
      relation,
      enumValues: null,
      ...modifiers,
    }
  }

  // enum: fieldName enum(val1, val2) [modifiers]
  if (trimmed.includes('enum(')) {
    const match = trimmed.match(/^(\w+)\s+enum\(([^)]+)\)(.*)$/)
    if (!match) throw new ParseError(`Sintaxe de enum inválida: "${trimmed}"`, lineNum)

    const name = match[1]
    const enumValues = match[2].split(',').map(v => v.trim())
    const rest = match[3].trim().split(/\s+/).filter(Boolean)
    const modifiers = parseModifiers(rest)

    return {
      name,
      type: 'enum',
      relation: null,
      enumValues,
      ...modifiers,
    }
  }

  // tipo simples: fieldName type [modifiers]
  const parts = trimmed.split(/\s+/)
  const [name, type, ...rest] = parts

  if (!name || !type) {
    throw new ParseError(`Campo inválido: "${trimmed}" — esperado "nome tipo"`, lineNum)
  }

  if (!FIELD_TYPES.has(type)) {
    throw new ParseError(`Tipo desconhecido "${type}" no campo "${name}" — use: text, number, boolean, enum(...)`, lineNum)
  }

  const modifiers = parseModifiers(rest)

  return {
    name,
    type,
    relation: null,
    enumValues: null,
    ...modifiers,
  }
}

function parseIntentAction(line, lineNum) {
  const trimmed = line.trim()

  if (trimmed.startsWith('save ')) {
    const entity = trimmed.replace('save ', '').trim()
    return { type: 'save', entity }
  }

  if (trimmed.startsWith('emit ')) {
    const event = trimmed.replace('emit ', '').trim()
    return { type: 'emit', event }
  }

  if (trimmed.startsWith('require ')) {
    const fields = trimmed.replace('require ', '').split(',').map(f => f.trim())
    return { type: 'require', fields }
  }

  if (trimmed.startsWith('validate ')) {
    return { type: 'validate', raw: trimmed.replace('validate ', '').trim() }
  }

  if (trimmed.startsWith('log ')) {
    const message = trimmed.replace(/^log\s+["']?/, '').replace(/["']$/, '')
    return { type: 'log', message }
  }

  if (trimmed.startsWith('authorize ')) {
    const raw = trimmed.replace('authorize ', '').trim()
    return { type: 'authorize', raw }
  }

  if (trimmed.startsWith('custom js:')) {
    const code = trimmed.replace('custom js:', '').trim()
    return { type: 'custom', code }
  }

  throw new ParseError(`Ação desconhecida: "${trimmed}"`, lineNum)
}

function getIndent(line) {
  return line.match(/^(\s*)/)[1].length
}

/**
 * Parseia código .nexus e retorna AST
 * @param {string} input
 * @returns {NexusAST}
 */
export function parseNexus(input) {
  const lines = input.split('\n')
  const entities = []
  const intents = []
  const events = []

  let currentBlock = null // { type, ref }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNum = i + 1
    const trimmed = raw.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = getIndent(raw)

    // bloco de nível 0: definição de entidade, intent ou evento
    if (indent === 0) {
      // intent create something:
      if (trimmed.startsWith('intent ')) {
        const name = trimmed.replace(/^intent\s+/, '').replace(/:$/, '').trim()
        const intent = { name, actions: [] }
        intents.push(intent)
        currentBlock = { type: 'intent', ref: intent }
        continue
      }

      // event SomeName:
      if (trimmed.startsWith('event ')) {
        const name = trimmed.replace(/^event\s+/, '').replace(/:$/, '').trim()
        const event = { name, actions: [] }
        events.push(event)
        currentBlock = { type: 'event', ref: event }
        continue
      }

      // EntityName:
      if (trimmed.endsWith(':') && /^[A-Z]/.test(trimmed)) {
        const name = trimmed.replace(/:$/, '').trim()
        const entity = { name, fields: [] }
        entities.push(entity)
        currentBlock = { type: 'entity', ref: entity }
        continue
      }

      throw new ParseError(`Linha não reconhecida: "${trimmed}"`, lineNum)
    }

    // conteúdo indentado — pertence ao bloco atual
    if (!currentBlock) {
      throw new ParseError(`Conteúdo indentado sem bloco pai: "${trimmed}"`, lineNum)
    }

    if (currentBlock.type === 'entity') {
      currentBlock.ref.fields.push(parseField(raw, lineNum))
      continue
    }

    if (currentBlock.type === 'intent' || currentBlock.type === 'event') {
      currentBlock.ref.actions.push(parseIntentAction(raw, lineNum))
      continue
    }
  }

  return { entities, intents, events }
}
