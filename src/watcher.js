/**
 * Nexus Dev Watcher
 * Observa app.nexus e reinicia o servidor quando o arquivo muda
 */

import fs from 'fs'
import { parseNexus, ParseError } from './parser.js'
import { validateAST, ValidationError } from './validator.js'
import { migrate } from './migrate.js'
import { buildIntentMap } from './engine.js'
import { getIntentAuthRule } from './auth.js'
import { runSandbox, SandboxError } from './sandbox.js'
import { startServer } from './server.js'
import pkg from 'pg'

const { Client } = pkg

const RESET  = '\x1b[0m'
const GREEN  = '\x1b[32m'
const CYAN   = '\x1b[36m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

function createEventSystem(events) {
  const handlers = new Map()
  for (const ev of events) {
    handlers.set(ev.name, async ({ saved, user }) => {
      for (const action of ev.actions) {
        if (action.type === 'log') {
          console.log(`${DIM}[event:${ev.name}]${RESET} ${action.message}`, saved?.id ? `id=${saved.id}` : '')
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

function buildFullIntentMap(intents, entities, db, emit) {
  const baseMap = buildIntentMap(intents, entities, db, emit)
  const map = {}
  for (const intent of intents) {
    const base = baseMap[intent.name]
    const customAction = intent.actions.find(a => a.type === 'custom')
    map[intent.name] = async (rawData, user) => {
      let data = rawData
      if (customAction) {
        try {
          const { result } = await runSandbox(customAction.code, data)
          if (result !== undefined) data = { ...data, ...result }
        } catch (err) {
          if (err instanceof SandboxError) throw new ValidationError(err.message)
          throw err
        }
      }
      return base(data, user)
    }
  }
  return map
}

function buildAuthMap(intents) {
  const map = {}
  for (const intent of intents) map[intent.name] = getIntentAuthRule(intent)
  return map
}

function printBanner(ast) {
  const time = new Date().toLocaleTimeString('pt-BR')
  console.log(`\n${BOLD}${GREEN} NEXUS ${RESET}${DIM} ${time}${RESET}`)
  console.log(`${DIM}  ${ast.entities.length} entidades · ${ast.intents.length} intents · ${ast.events.length} eventos${RESET}`)
  console.log(`${GREEN}  servidor em http://localhost:${process.env.PORT ?? 3000}${RESET}`)
  console.log(`${CYAN}  dashboard em http://localhost:${process.env.PORT ?? 3000}/_nexus${RESET}\n`)
}

function printReloadBanner() {
  console.log(`\n${CYAN}  ↻ app.nexus alterado — recarregando...${RESET}`)
}

async function load(nexusFile, db) {
  let raw
  try {
    raw = fs.readFileSync(nexusFile, 'utf-8')
  } catch {
    throw new Error(`arquivo não encontrado: ${nexusFile}`)
  }

  let ast
  try {
    ast = parseNexus(raw)
  } catch (err) {
    if (err instanceof ParseError) throw new Error(`erro de sintaxe: ${err.message}`)
    throw err
  }

  try {
    validateAST(ast)
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(`schema inválido: ${err.message}`)
    throw err
  }

  await migrate(ast, db, { dryRun: false })

  const eventSystem = createEventSystem(ast.events)
  const intentMap = buildFullIntentMap(ast.intents, ast.entities, db, eventSystem.emit)
  const authMap = buildAuthMap(ast.intents)

  const server = startServer(intentMap, authMap, ast, db)
  printBanner(ast)

  return {
    close: async () => {
      await server.close()
    }
  }
}

export async function devWatch(nexusFile) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? 'postgres://willian@localhost:5432/nexus'
  })
  await db.connect()

  let instance = null
  let reloading = false
  let pendingReload = false

  async function start() {
    try {
      instance = await load(nexusFile, db)
    } catch (err) {
      console.error(`\n${RED}  ✗ ${err.message}${RESET}`)
      console.log(`${YELLOW}  Corrija o app.nexus e salve novamente${RESET}\n`)
      instance = null
    }
  }

  async function reload() {
    if (reloading) {
      pendingReload = true
      return
    }

    reloading = true
    printReloadBanner()

    try {
      if (instance) {
        await instance.close()
        instance = null
      }
      await start()
    } finally {
      reloading = false
      if (pendingReload) {
        pendingReload = false
        reload()
      }
    }
  }

  await start()

  let debounceTimer = null
  fs.watch(nexusFile, (eventType) => {
    if (eventType !== 'change') return
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(reload, 150)
  })

  process.on('SIGINT', async () => {
    console.log(`\n${DIM}  encerrando...${RESET}`)
    if (instance) await instance.close()
    await db.end()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    if (instance) await instance.close()
    await db.end()
    process.exit(0)
  })
}
