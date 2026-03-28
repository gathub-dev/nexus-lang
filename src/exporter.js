/**
 * Nexus Project Exporter
 * Gera um projeto completo em ZIP para download
 */

import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Source files that make up the nexus-lang runtime
 */
// Files to copy as-is (no studio/generator/exporter dependencies)
const SRC_FILES = [
  'parser.js',
  'validator.js',
  'engine.js',
  'migrate.js',
  'auth.js',
  'query.js',
  'sandbox.js',
  'dashboard.js',
  'swagger.js',
]

/**
 * Generate a complete project ZIP
 * @param {string} nexusCode - the .nexus file content
 * @param {string} projectName - project name (used for folder and package.json)
 * @returns {Promise<Buffer>} ZIP file as buffer
 */
export async function generateProjectZip(nexusCode, projectName = 'meu-sistema') {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')

  return new Promise((resolve, reject) => {
    const chunks = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', chunk => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    // ── package.json ──
    archive.append(JSON.stringify({
      name: safeName,
      version: '1.0.0',
      description: `API gerada pelo Nexus Studio`,
      type: 'module',
      scripts: {
        dev: 'node bin/nexus.js dev',
        start: 'NODE_ENV=production node bin/nexus.js start',
        migrate: 'node bin/nexus.js migrate',
        'migrate:dry': 'node bin/nexus.js migrate --dry-run',
        check: 'node bin/nexus.js check',
      },
      dependencies: {
        fastify: '^5.0.0',
        pg: '^8.12.0',
        jsonwebtoken: '^9.0.0',
      },
      engines: { node: '>=18' },
    }, null, 2) + '\n', { name: `${safeName}/package.json` })

    // ── app.nexus ──
    archive.append(nexusCode, { name: `${safeName}/app.nexus` })

    // ── .env.example ──
    archive.append(
      `# Configuracao do banco PostgreSQL\nDATABASE_URL=postgres://usuario:senha@localhost:5432/${safeName}\n\n# Porta do servidor\nPORT=3000\n\n# Ambiente (development ou production)\nNODE_ENV=development\n\n# Chave secreta JWT (OBRIGATORIO em producao)\nNEXUS_JWT_SECRET=troque-esta-chave-em-producao\n\n# Dominios permitidos para fetch em custom js (opcional)\n# NEXUS_FETCH_ALLOWLIST=api.stripe.com,hooks.slack.com\n\n# Timeout para codigo custom (ms)\n# NEXUS_SANDBOX_TIMEOUT=3000\n`,
      { name: `${safeName}/.env.example` }
    )

    // ── .env (dev defaults) ──
    archive.append(
      `DATABASE_URL=postgres://postgres:postgres@localhost:5432/${safeName}\nPORT=3000\nNODE_ENV=development\nNEXUS_JWT_SECRET=dev-secret-troque-em-producao\n`,
      { name: `${safeName}/.env` }
    )

    // ── .gitignore ──
    archive.append('node_modules/\n.env\n*.log\n.DS_Store\n', { name: `${safeName}/.gitignore` })

    // ── README.md ──
    const readme = `# ${safeName}

API gerada automaticamente pelo [Nexus Studio](https://github.com/gathub-dev/nexus-lang).

## Requisitos

- **Node.js** >= 18
- **PostgreSQL** >= 13

## Setup

\`\`\`bash
# 1. Instalar dependencias
npm install

# 2. Criar o banco de dados
createdb ${safeName}

# 3. Configurar o .env
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL

# 4. Rodar em desenvolvimento
npm run dev
\`\`\`

## URLs

| URL | Descricao |
|-----|-----------|
| \`http://localhost:3000\` | API |
| \`http://localhost:3000/docs\` | Swagger / Documentacao |
| \`http://localhost:3000/_nexus\` | Dashboard (dev only) |

## Comandos

\`\`\`bash
npm run dev          # Servidor com hot reload
npm start            # Servidor em producao
npm run migrate      # Aplicar migracoes
npm run migrate:dry  # Ver plano de migracao
npm run check        # Validar app.nexus
\`\`\`

## API

### Autenticacao
\`\`\`bash
# Gerar token
curl -X POST http://localhost:3000/auth/token \\
  -H 'Content-Type: application/json' \\
  -d '{"id": 1, "role": "admin"}'
\`\`\`

### Executar intents
\`\`\`bash
curl -X POST http://localhost:3000/intent/NOME-DO-INTENT \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer SEU_TOKEN' \\
  -d '{"campo": "valor"}'
\`\`\`

### Queries
\`\`\`bash
curl -X POST http://localhost:3000/query \\
  -H 'Content-Type: application/json' \\
  -d '{"q": "find entidade where campo = valor limit 10"}'
\`\`\`

---

Gerado com [Nexus Language](https://github.com/gathub-dev/nexus-lang)
`
    archive.append(readme, { name: `${safeName}/README.md` })

    // ── bin/nexus.js ── (CLI - read from actual file)
    const binPath = path.resolve(__dirname, '..', 'bin', 'nexus.js')
    if (fs.existsSync(binPath)) {
      archive.file(binPath, { name: `${safeName}/bin/nexus.js`, mode: 0o755 })
    }

    // ── src/ files that can be copied as-is ──
    for (const file of SRC_FILES) {
      const filePath = path.resolve(__dirname, file)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${safeName}/src/${file}` })
      }
    }

    // ── src/server.js ── (standalone version without studio/generator)
    archive.append(STANDALONE_SERVER, { name: `${safeName}/src/server.js` })

    // ── src/index.js ── (standalone version)
    archive.append(STANDALONE_INDEX, { name: `${safeName}/src/index.js` })

    // ── src/watcher.js ── (copy from source)
    const watcherPath = path.resolve(__dirname, 'watcher.js')
    if (fs.existsSync(watcherPath)) {
      archive.file(watcherPath, { name: `${safeName}/src/watcher.js` })
    }

    archive.finalize()
  })
}

// ── Standalone server.js (no studio/generator/exporter imports) ──
const STANDALONE_SERVER = `import Fastify from 'fastify'
import { enforceAuth, generateToken, AuthError, warnDefaultSecret } from './auth.js'
import { executeQuery } from './query.js'
import { getDashboardHTML } from './dashboard.js'
import { generateOpenAPISpec, getSwaggerHTML } from './swagger.js'
import { ValidationError } from './validator.js'

const IS_DEV = process.env.NODE_ENV !== 'production'

function createRateLimiter({ max = 60, windowMs = 60_000 } = {}) {
  const buckets = new Map()
  setInterval(() => buckets.clear(), windowMs).unref()
  return function check(ip) {
    const count = (buckets.get(ip) ?? 0) + 1
    buckets.set(ip, count)
    return count <= max
  }
}

export function startServer(intentMap, authMap, ast, db) {
  const app = Fastify({ logger: IS_DEV })
  const rateLimiter = createRateLimiter({ max: 60, windowMs: 60_000 })
  const port = parseInt(process.env.PORT ?? '3000')

  warnDefaultSecret()

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.removeHeader('X-Powered-By')
    reply.removeHeader('Server')
  })

  app.addHook('preHandler', async (req, reply) => {
    if (!rateLimiter(req.ip)) {
      reply.status(429).send({ error: 'Too many requests' })
    }
  })

  app.get('/health', async () => ({ ok: true, timestamp: new Date().toISOString() }))

  app.post('/auth/token', async (req, reply) => {
    try {
      const { id, role } = req.body ?? {}
      if (!id) { reply.status(400); return { error: 'Campo "id" obrigatorio' } }
      return { token: generateToken({ id, role }) }
    } catch (err) { reply.status(400); return { error: err.message } }
  })

  if (IS_DEV) {
    app.get('/intents', async () => ({ intents: Object.keys(intentMap) }))
  }

  app.post('/intent/:name', async (req, reply) => {
    const name = req.params.name.replace(/-/g, ' ')
    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) { reply.status(400); return { error: 'Nome de intent invalido' } }
    const fn = intentMap[name]
    if (!fn) { reply.status(404); return { error: 'Intent nao encontrada: ' + name } }
    try {
      const rule = authMap?.[name] ?? { type: 'authenticated' }
      const user = enforceAuth(req, rule)
      return await fn(req.body ?? {}, user)
    } catch (err) {
      if (err instanceof AuthError) { reply.status(err.statusCode); return { error: err.message } }
      reply.status(400); return { error: IS_DEV ? err.message : 'Erro ao processar requisicao' }
    }
  })

  app.post('/query', async (req, reply) => {
    try {
      const { q } = req.body ?? {}
      if (!q) { reply.status(400); return { error: 'Campo "q" obrigatorio' } }
      return await executeQuery(q, ast, db)
    } catch (err) { reply.status(400); return { error: IS_DEV ? err.message : 'Erro na query' } }
  })

  app.get('/query', async (req, reply) => {
    try {
      const q = req.query.q
      if (!q) { reply.status(400); return { error: 'Parametro "q" obrigatorio' } }
      return await executeQuery(q, ast, db)
    } catch (err) { reply.status(400); return { error: IS_DEV ? err.message : 'Erro na query' } }
  })

  app.get('/docs', async (req, reply) => {
    reply.type('text/html')
    return getSwaggerHTML(generateOpenAPISpec(ast, port))
  })

  app.get('/docs/json', async (req, reply) => {
    return generateOpenAPISpec(ast, port)
  })

  if (IS_DEV) {
    app.get('/_nexus', async (req, reply) => {
      reply.type('text/html')
      return getDashboardHTML(ast, port)
    })
  }

  app.listen({ port, host: '0.0.0.0' })
  console.log('[nexus] servidor em http://localhost:' + port)
  console.log('[nexus] docs/swagger em http://localhost:' + port + '/docs')
  if (IS_DEV) console.log('[nexus] dashboard em http://localhost:' + port + '/_nexus')

  return app
}
`

// ── Standalone index.js ──
const STANDALONE_INDEX = `import fs from 'fs'
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
    handlers.set(ev.name, async ({ saved }) => {
      for (const action of ev.actions) {
        if (action.type === 'log') {
          console.log('[event:' + ev.name + '] ' + action.message, saved?.id ? '-> id=' + saved.id : '')
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
  try { raw = fs.readFileSync(nexusFile, 'utf-8') }
  catch { console.error('[nexus] app.nexus nao encontrado'); process.exit(1) }

  let ast
  try { ast = parseNexus(raw) }
  catch (err) {
    if (err instanceof ParseError) { console.error('[nexus] erro de sintaxe:', err.message); process.exit(1) }
    throw err
  }

  try { validateAST(ast) }
  catch (err) {
    if (err instanceof ValidationError) { console.error('[nexus] schema invalido:', err.message); process.exit(1) }
    throw err
  }

  console.log('[nexus] schema valido — ' + ast.entities.length + ' entidades, ' + ast.intents.length + ' intents')

  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/nexus'
  })
  await db.connect()
  await migrate(ast, db, { dryRun: false })

  const eventSystem = createEventSystem(ast.events)
  const intentMap = buildIntentMap(ast.intents, ast.entities, db, eventSystem.emit)
  const authMap = buildAuthMap(ast.intents)

  startServer(intentMap, authMap, ast, db)
}

export { parseNexus, ParseError } from './parser.js'
export { validateAST, ValidationError, sanitizeInput } from './validator.js'
export { buildIntentMap } from './engine.js'
export { migrate, diffSchema } from './migrate.js'
export { generateToken, verifyToken } from './auth.js'
export { executeQuery, parseQuery } from './query.js'
`
