import { sanitizeInput, ValidationError } from './validator.js'

function fieldToSQL(field) {
  const notNull = field.required ? ' NOT NULL' : ''

  if (field.type === 'relation') {
    return `${field.name}_id INTEGER REFERENCES ${field.relation.toLowerCase()}(id)${notNull}`
  }
  if (field.type === 'number') {
    return `${field.name} INTEGER${notNull}`
  }
  if (field.type === 'boolean') {
    return `${field.name} BOOLEAN${notNull}`
  }
  if (field.type === 'enum') {
    const vals = field.enumValues.map(v => `'${v}'`).join(', ')
    return `${field.name} TEXT CHECK (${field.name} IN (${vals}))${notNull}`
  }
  // text
  const unique = field.unique ? ' UNIQUE' : ''
  return `${field.name} TEXT${unique}${notNull}`
}

export function buildIntentMap(intents, entities, db, emit) {
  const entityMap = new Map(entities.map(e => [e.name, e]))
  const map = {}

  for (const intent of intents) {
    map[intent.name] = async (rawData, user) => {
      // validação de require
      const requireAction = intent.actions.find(a => a.type === 'require')
      if (requireAction) {
        for (const field of requireAction.fields) {
          const val = rawData[field] ?? rawData[`${field}_id`]
          if (val === undefined || val === null || val === '') {
            throw new ValidationError(`Campo obrigatório ausente: ${field}`)
          }
        }
      }

      let lastSaved = null

      for (const action of intent.actions) {
        if (action.type === 'save') {
          const entity = entityMap.get(action.entity)
          if (!entity) throw new ValidationError(`Entidade não encontrada: ${action.entity}`)

          // sanitização: só campos do schema passam
          const data = sanitizeInput(rawData, entity)

          if (Object.keys(data).length === 0) {
            throw new ValidationError(`Nenhum campo válido para salvar em ${entity.name}`)
          }

          const keys = Object.keys(data)
          const values = Object.values(data)
          const fields = keys.join(', ')
          const params = keys.map((_, i) => `$${i + 1}`).join(', ')

          const result = await db.query(
            `INSERT INTO "${entity.name.toLowerCase()}" (${fields}) VALUES (${params}) RETURNING *`,
            values
          )

          lastSaved = result.rows[0]
        }

        if (action.type === 'emit') {
          await emit(action.event, { saved: lastSaved, input: rawData, user })
        }

        if (action.type === 'log') {
          console.log(`[intent:${intent.name}] ${action.message}`)
        }
      }

      return { ok: true, data: lastSaved }
    }
  }

  return map
}
