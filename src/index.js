/**
 * Nexus Language — Entry Point
 * Usado pelo CLI em modo produção
 */

import fs from 'fs'
import { parseNexus, ParseError } from './parser.js'
import { validateAST, ValidationError } from './validator.js'
import { buildIntentMap } from './engine.js'
import { migrate } from './migrate.js'
import { startServer } from './server.js'
import { getIntentAuthRule } from './auth.js'
import pkg from 'pg'

const { Client } = pkg

function createEventSystem(events) {
  const handlers = new Map()

  for (const ev of events) {
    handlers.set(ev.name, async ({ saved, input, user }) => {
      for (const action of ev.actions) {
        if (action.type === 'log') {
          console.log(`[event:${ev.name}] ${action.message}`, saved?.id ? `→ id=${saved.id}` : '')
        }
      }
    })
  }

  return {
    emit: async (name, data) => {
      const handler = handlers.get(name)
      if (handler) setImmediate(() => handler(data).catch(console.error))
    }
  }
}

function buildAuthMap(intents) {
  const map = {}
  for (const intent of intents) map[intent.name] = getIntentAuthRule(intent)
  return map
}

export async function startProduction(nexusFile) {
  let raw
  try {
    raw = fs.readFileSync(nexusFile, 'utf-8')
  } catch {
    console.error('[nexus] app.nexus não encontrado')
    process.exit(1)
  }

  let ast
  try {
    ast = parseNexus(raw)
  } catch (err) {
    if (err instanceof ParseError) {
      console.error('[nexus] erro de sintaxe:', err.message)
      process.exit(1)
    }
    throw err
  }

  try {
    validateAST(ast)
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error('[nexus] schema inválido:', err.message)
      process.exit(1)
    }
    throw err
  }

  console.log(`[nexus] schema válido — ${ast.entities.length} entidades, ${ast.intents.length} intents`)

  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? 'postgres://willian@localhost:5432/nexus'
  })
  await db.connect()

  await migrate(ast, db, { dryRun: false })

  const eventSystem = createEventSystem(ast.events)
  const intentMap = buildIntentMap(ast.intents, ast.entities, db, eventSystem.emit)
  const authMap = buildAuthMap(ast.intents)

  startServer(intentMap, authMap, ast, db)
}

// Exporta componentes para uso programático
export { parseNexus, ParseError } from './parser.js'
export { validateAST, ValidationError, sanitizeInput } from './validator.js'
export { buildIntentMap } from './engine.js'
export { migrate, diffSchema } from './migrate.js'
export { generateToken, verifyToken } from './auth.js'
export { executeQuery, parseQuery } from './query.js'
