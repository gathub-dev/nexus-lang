#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

// load .env manually (dotenv v17 compatibility)
try {
  const envPath = path.resolve(process.cwd(), '.env')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      if (key && !process.env[key]) process.env[key] = val
    }
  })
} catch {}
import { parseNexus, ParseError } from '../src/parser.js'
import { validateAST, ValidationError } from '../src/validator.js'

const RESET  = '\x1b[0m'
const GREEN  = '\x1b[32m'
const CYAN   = '\x1b[36m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

const command = process.argv[2]
const nexusFile = path.resolve(process.cwd(), 'app.nexus')

function banner() {
  console.log(`\n${BOLD}${GREEN} NEXUS ${RESET}${DIM}v0.1.0${RESET}\n`)
}

function findNexusFile() {
  if (!fs.existsSync(nexusFile)) {
    console.error(`${RED}  app.nexus não encontrado em ${process.cwd()}${RESET}`)
    console.log(`${DIM}  Crie um app.nexus ou use: npx create-nexus-app meu-projeto${RESET}\n`)
    process.exit(1)
  }
  return nexusFile
}

async function cmdDev() {
  banner()
  const file = findNexusFile()
  const { devWatch } = await import('../src/watcher.js')
  await devWatch(file)
}

async function cmdStart() {
  banner()
  const file = findNexusFile()
  process.env.NODE_ENV = 'production'
  const { startProduction } = await import('../src/index.js')
  await startProduction(file)
}

async function cmdMigrate() {
  banner()
  const file = findNexusFile()
  const dryRun = process.argv.includes('--dry-run')

  const raw = fs.readFileSync(file, 'utf-8')
  const ast = parseNexus(raw)
  validateAST(ast)

  const { default: pkg } = await import('pg')
  const { Client } = pkg
  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? 'postgres://willian@localhost:5432/nexus'
  })
  await db.connect()

  const { migrate } = await import('../src/migrate.js')
  const result = await migrate(ast, db, { dryRun })

  await db.end()

  if (dryRun) {
    console.log(`\n${YELLOW}  DRY RUN — nenhuma alteração aplicada${RESET}\n`)
  } else {
    console.log(`\n${GREEN}  ${result.applied} alterações aplicadas${RESET}\n`)
  }
  process.exit(0)
}

async function cmdCheck() {
  banner()
  const file = findNexusFile()

  try {
    const raw = fs.readFileSync(file, 'utf-8')
    const ast = parseNexus(raw)
    validateAST(ast)

    console.log(`${GREEN}  Schema válido${RESET}`)
    console.log(`${DIM}  ${ast.entities.length} entidades · ${ast.intents.length} intents · ${ast.events.length} eventos${RESET}\n`)

    for (const e of ast.entities) {
      console.log(`  ${CYAN}${e.name}${RESET} — ${e.fields.length} campos`)
    }
    for (const i of ast.intents) {
      console.log(`  ${YELLOW}intent ${i.name}${RESET} — ${i.actions.length} ações`)
    }
    console.log()
    process.exit(0)
  } catch (err) {
    if (err instanceof ParseError || err instanceof ValidationError) {
      console.error(`${RED}  ${err.message}${RESET}\n`)
      process.exit(1)
    }
    throw err
  }
}

function showHelp() {
  banner()
  console.log(`  Uso: ${BOLD}nexus <comando>${RESET}\n`)
  console.log(`  Comandos:`)
  console.log(`    ${GREEN}dev${RESET}                servidor com hot reload`)
  console.log(`    ${GREEN}start${RESET}              servidor em produção`)
  console.log(`    ${GREEN}migrate${RESET}            aplica migrações no banco`)
  console.log(`    ${GREEN}migrate --dry-run${RESET}  mostra plano sem executar`)
  console.log(`    ${GREEN}check${RESET}              valida o app.nexus`)
  console.log()
}

switch (command) {
  case 'dev':     cmdDev(); break
  case 'start':   cmdStart(); break
  case 'migrate': cmdMigrate(); break
  case 'check':   cmdCheck(); break
  default:        showHelp(); break
}
