#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const RESET  = '\x1b[0m'
const GREEN  = '\x1b[32m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

const projectName = process.argv[2]

if (!projectName) {
  console.log(`\n${BOLD}${GREEN} NEXUS ${RESET}${DIM}create-nexus-app${RESET}\n`)
  console.log(`  Uso: ${BOLD}npx create-nexus-app <nome>${RESET}\n`)
  console.log(`  Exemplo:`)
  console.log(`    ${CYAN}npx create-nexus-app meu-sistema${RESET}`)
  console.log(`    ${DIM}cd meu-sistema${RESET}`)
  console.log(`    ${DIM}npm install${RESET}`)
  console.log(`    ${DIM}npm run dev${RESET}\n`)
  process.exit(1)
}

const projectDir = path.resolve(process.cwd(), projectName)

if (fs.existsSync(projectDir)) {
  console.error(`\n  Pasta "${projectName}" já existe.\n`)
  process.exit(1)
}

console.log(`\n${BOLD}${GREEN} NEXUS ${RESET} Criando projeto "${projectName}"...\n`)

fs.mkdirSync(projectDir, { recursive: true })

// package.json
fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
  name: projectName,
  version: "0.1.0",
  type: "module",
  scripts: {
    dev: "nexus dev",
    start: "nexus start",
    migrate: "nexus migrate",
    check: "nexus check"
  },
  dependencies: {
    "nexus-lang": "^0.1.0"
  }
}, null, 2) + '\n')

// app.nexus
fs.writeFileSync(path.join(projectDir, 'app.nexus'), `# ${projectName}
# Defina seu sistema aqui

User:
  name text required
  email text unique required
  role enum(admin, user)

Product:
  name text required
  price number required
  description text
  active boolean

Order:
  user -> User required
  total number required
  status enum(pending, paid, shipped, delivered)

# Intents (operacoes da API)

intent create user:
  authorize public
  require name, email
  save User
  emit UserCreated

intent create product:
  authorize role(admin)
  require name, price
  save Product

intent create order:
  require user, total
  save Order
  emit OrderCreated

# Eventos

event UserCreated:
  log "novo usuario criado"

event OrderCreated:
  log "novo pedido criado"
`)

// .env
fs.writeFileSync(path.join(projectDir, '.env'), `DATABASE_URL=postgres://postgres:postgres@localhost:5432/${projectName}
PORT=3000
NODE_ENV=development
NEXUS_JWT_SECRET=troque-esta-chave-em-producao
`)

// .env.example
fs.writeFileSync(path.join(projectDir, '.env.example'), `DATABASE_URL=postgres://user:pass@host:5432/dbname
PORT=3000
NODE_ENV=development
NEXUS_JWT_SECRET=sua-chave-secreta
NEXUS_FETCH_ALLOWLIST=api.stripe.com,hooks.slack.com
NEXUS_SANDBOX_TIMEOUT=3000
`)

// .gitignore
fs.writeFileSync(path.join(projectDir, '.gitignore'), `node_modules/
.env
*.log
`)

console.log(`  ${GREEN}package.json${RESET}`)
console.log(`  ${GREEN}app.nexus${RESET}`)
console.log(`  ${GREEN}.env${RESET}`)
console.log(`  ${GREEN}.env.example${RESET}`)
console.log(`  ${GREEN}.gitignore${RESET}`)
console.log()
console.log(`${BOLD}  Pronto!${RESET}\n`)
console.log(`  ${DIM}cd ${projectName}${RESET}`)
console.log(`  ${DIM}npm install${RESET}`)
console.log(`  ${DIM}npm run dev${RESET}\n`)
console.log(`  ${DIM}Dashboard: http://localhost:3000/_nexus${RESET}\n`)
