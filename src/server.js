import fs from 'fs'
import path from 'path'
import Fastify from 'fastify'
import { enforceAuth, generateToken, AuthError, warnDefaultSecret } from './auth.js'
import { executeQuery } from './query.js'
import { getDashboardHTML } from './dashboard.js'
import { getStudioHTML } from './studio-html.js'
import { generateNexus, validateNexusCode } from './generator.js'
import { parseNexus } from './parser.js'
import { validateAST, ValidationError } from './validator.js'
import { migrate } from './migrate.js'

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

  // headers de segurança
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.removeHeader('X-Powered-By')
    reply.removeHeader('Server')
  })

  // rate limiting
  app.addHook('preHandler', async (req, reply) => {
    if (!rateLimiter(req.ip)) {
      reply.status(429).send({ error: 'Too many requests' })
    }
  })

  // ──────── HEALTH ────────
  app.get('/health', async () => ({ ok: true, timestamp: new Date().toISOString() }))

  // ──────── AUTH ────────
  app.post('/auth/token', async (req, reply) => {
    try {
      const { id, role } = req.body ?? {}
      if (!id) {
        reply.status(400)
        return { error: 'Campo "id" obrigatório' }
      }
      const token = generateToken({ id, role })
      return { token }
    } catch (err) {
      reply.status(400)
      return { error: err.message }
    }
  })

  // ──────── INTENTS ────────
  if (IS_DEV) {
    app.get('/intents', async () => ({
      intents: Object.keys(intentMap),
      note: 'Esta rota só existe em development'
    }))
  }

  app.post('/intent/:name', async (req, reply) => {
    const name = req.params.name.replace(/-/g, ' ')

    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
      reply.status(400)
      return { error: 'Nome de intent inválido' }
    }

    const fn = intentMap[name]
    if (!fn) {
      reply.status(404)
      return { error: `Intent não encontrada: ${name}` }
    }

    try {
      // enforce auth
      const rule = authMap?.[name] ?? { type: 'authenticated' }
      const user = enforceAuth(req, rule)

      return await fn(req.body ?? {}, user)
    } catch (err) {
      if (err instanceof AuthError) {
        reply.status(err.statusCode)
        return { error: err.message }
      }
      const message = IS_DEV ? err.message : 'Erro ao processar requisição'
      reply.status(400)
      return { error: message }
    }
  })

  // ──────── QUERY ────────
  app.post('/query', async (req, reply) => {
    try {
      const { q } = req.body ?? {}
      if (!q) {
        reply.status(400)
        return { error: 'Campo "q" obrigatório' }
      }
      const result = await executeQuery(q, ast, db)
      return result
    } catch (err) {
      const message = IS_DEV ? err.message : 'Erro ao executar query'
      reply.status(400)
      return { error: message }
    }
  })

  app.get('/query', async (req, reply) => {
    try {
      const q = req.query.q
      if (!q) {
        reply.status(400)
        return { error: 'Parâmetro "q" obrigatório' }
      }
      const result = await executeQuery(q, ast, db)
      return result
    } catch (err) {
      const message = IS_DEV ? err.message : 'Erro ao executar query'
      reply.status(400)
      return { error: message }
    }
  })

  // ──────── DASHBOARD ────────
  if (IS_DEV) {
    app.get('/_nexus', async (req, reply) => {
      reply.type('text/html')
      return getDashboardHTML(ast, port)
    })
  }

  // ──────── STUDIO ────────
  if (IS_DEV) {
    app.get('/_studio', async (req, reply) => {
      reply.type('text/html')
      return getStudioHTML()
    })

    app.post('/_studio/chat', async (req, reply) => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        reply.status(500)
        return { error: 'ANTHROPIC_API_KEY nao configurada. Adicione no .env' }
      }

      const { messages } = req.body ?? {}
      if (!messages || !Array.isArray(messages)) {
        reply.status(400)
        return { error: 'Campo "messages" obrigatorio' }
      }

      try {
        const result = await generateNexus(apiKey, messages)
        const validation = result.nexusCode ? validateNexusCode(result.nexusCode) : null
        return {
          message: result.message,
          nexusCode: result.nexusCode,
          validation,
        }
      } catch (err) {
        reply.status(500)
        return { error: err.message }
      }
    })

    app.post('/_studio/deploy', async (req, reply) => {
      const { code } = req.body ?? {}
      if (!code) {
        reply.status(400)
        return { error: 'Campo "code" obrigatorio' }
      }

      try {
        // validate
        const newAst = parseNexus(code)
        validateAST(newAst)

        // save app.nexus
        const nexusPath = path.resolve(process.cwd(), 'app.nexus')
        fs.writeFileSync(nexusPath, code, 'utf-8')

        // run migrations
        await migrate(newAst, db, { dryRun: false })

        return { ok: true, message: 'Sistema criado! O servidor vai recarregar automaticamente.' }
      } catch (err) {
        reply.status(400)
        return { error: err.message }
      }
    })
  }

  // ──────── START ────────
  app.listen({ port, host: '0.0.0.0' })
  console.log(`[nexus] servidor em http://localhost:${port}`)
  if (IS_DEV) {
    console.log(`[nexus] dashboard em http://localhost:${port}/_nexus`)
    console.log(`[nexus] studio em http://localhost:${port}/_studio`)
  } else {
    console.log('[nexus] modo produção — dashboard e /intents desabilitados')
  }

  return app
}
