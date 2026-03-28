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
const SRC_FILES = [
  'parser.js',
  'validator.js',
  'engine.js',
  'server.js',
  'migrate.js',
  'auth.js',
  'query.js',
  'sandbox.js',
  'watcher.js',
  'dashboard.js',
  'swagger.js',
  'index.js',
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

    // ── src/ files ── (copy all runtime source files)
    for (const file of SRC_FILES) {
      const filePath = path.resolve(__dirname, file)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${safeName}/src/${file}` })
      }
    }

    archive.finalize()
  })
}
