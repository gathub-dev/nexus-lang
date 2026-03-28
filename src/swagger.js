/**
 * Nexus Swagger Generator
 * Auto-generates OpenAPI 3.0 spec + Swagger UI from AST
 */

/**
 * Generate OpenAPI 3.0 spec from Nexus AST
 * @param {object} ast - Nexus AST
 * @param {number} port
 * @returns {object} OpenAPI spec
 */
export function generateOpenAPISpec(ast, port) {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Nexus API',
      description: 'API gerada automaticamente pelo Nexus Language',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${port}`, description: 'Development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via POST /auth/token',
        },
      },
      schemas: {},
    },
    paths: {},
    tags: [],
  }

  // ── Tags ──
  spec.tags.push({ name: 'Auth', description: 'Autenticacao e tokens' })
  spec.tags.push({ name: 'Intents', description: 'Operacoes do sistema' })
  spec.tags.push({ name: 'Query', description: 'Consultas de dados' })
  spec.tags.push({ name: 'System', description: 'Rotas do sistema' })

  // ── Schemas from entities ──
  for (const entity of ast.entities) {
    const properties = {
      id: { type: 'integer', description: 'ID auto-gerado' },
    }
    const required = []

    for (const field of entity.fields) {
      const prop = {}

      if (field.type === 'text') {
        prop.type = 'string'
      } else if (field.type === 'number') {
        prop.type = 'integer'
      } else if (field.type === 'boolean') {
        prop.type = 'boolean'
      } else if (field.type === 'enum') {
        prop.type = 'string'
        prop.enum = field.enumValues
      } else if (field.type === 'relation') {
        prop.type = 'integer'
        prop.description = `FK -> ${field.relation}`
      }

      const fieldName = field.type === 'relation' ? `${field.name}_id` : field.name
      properties[fieldName] = prop

      if (field.required) required.push(fieldName)
      if (field.unique) prop.description = (prop.description || '') + ' (unique)'
    }

    properties.created_at = { type: 'string', format: 'date-time' }

    spec.components.schemas[entity.name] = {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    }

    // Input schema (without id and created_at)
    const inputProps = { ...properties }
    delete inputProps.id
    delete inputProps.created_at
    spec.components.schemas[`${entity.name}Input`] = {
      type: 'object',
      properties: inputProps,
      required: required.length > 0 ? required : undefined,
    }
  }

  // ── Health ──
  spec.paths['/health'] = {
    get: {
      tags: ['System'],
      summary: 'Health check',
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, timestamp: { type: 'string' } } } } },
        },
      },
    },
  }

  // ── Auth ──
  spec.paths['/auth/token'] = {
    post: {
      tags: ['Auth'],
      summary: 'Gerar token JWT',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'integer', description: 'ID do usuario', example: 1 },
                role: { type: 'string', description: 'Role do usuario', example: 'admin', enum: ['admin', 'user'] },
              },
              required: ['id'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Token gerado',
          content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } },
        },
      },
    },
  }

  // ── Intents ──
  for (const intent of ast.intents) {
    const slug = intent.name.replace(/\s+/g, '-')
    const path = `/intent/${slug}`

    // find save action to get the entity
    const saveAction = intent.actions.find(a => a.type === 'save')
    const requireAction = intent.actions.find(a => a.type === 'require')
    const authAction = intent.actions.find(a => a.type === 'authorize')

    const entityName = saveAction?.entity
    const entity = ast.entities.find(e => e.name === entityName)

    // build request body schema from required fields and entity
    const bodyProps = {}
    const bodyRequired = []

    if (requireAction && entity) {
      for (const fieldName of requireAction.fields) {
        const field = entity.fields.find(f => f.name === fieldName || `${f.name}_id` === fieldName || f.name === fieldName.replace('_id', ''))
        if (field) {
          const key = field.type === 'relation' ? `${field.name}_id` : field.name
          if (field.type === 'text') bodyProps[key] = { type: 'string' }
          else if (field.type === 'number') bodyProps[key] = { type: 'integer' }
          else if (field.type === 'boolean') bodyProps[key] = { type: 'boolean' }
          else if (field.type === 'enum') bodyProps[key] = { type: 'string', enum: field.enumValues }
          else if (field.type === 'relation') bodyProps[key] = { type: 'integer', description: `FK -> ${field.relation}` }
          bodyRequired.push(key)
        } else {
          bodyProps[fieldName] = { type: 'string' }
          bodyRequired.push(fieldName)
        }
      }
    }

    // add optional fields from entity
    if (entity) {
      for (const field of entity.fields) {
        const key = field.type === 'relation' ? `${field.name}_id` : field.name
        if (!bodyProps[key]) {
          if (field.type === 'text') bodyProps[key] = { type: 'string' }
          else if (field.type === 'number') bodyProps[key] = { type: 'integer' }
          else if (field.type === 'boolean') bodyProps[key] = { type: 'boolean' }
          else if (field.type === 'enum') bodyProps[key] = { type: 'string', enum: field.enumValues }
          else if (field.type === 'relation') bodyProps[key] = { type: 'integer', description: `FK -> ${field.relation}` }
        }
      }
    }

    // auth
    const isPublic = authAction?.raw === 'public'
    const isAdmin = authAction?.raw?.startsWith('role(')
    let description = `Intent: ${intent.name}`
    if (isPublic) description += ' (publico)'
    else if (isAdmin) description += ` (requer ${authAction.raw})`
    else description += ' (requer autenticacao)'

    const pathItem = {
      post: {
        tags: ['Intents'],
        summary: intent.name,
        description,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: bodyProps,
                required: bodyRequired.length > 0 ? bodyRequired : undefined,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    data: entityName ? { '$ref': `#/components/schemas/${entityName}` } : { type: 'object' },
                  },
                },
              },
            },
          },
          400: { description: 'Erro de validacao' },
          401: { description: 'Token ausente ou invalido' },
          403: { description: 'Acesso negado (role insuficiente)' },
        },
      },
    }

    if (!isPublic) {
      pathItem.post.security = [{ bearerAuth: [] }]
    }

    spec.paths[path] = pathItem
  }

  // ── Query ──
  const querySchema = {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        description: 'Query em linguagem Nexus',
        example: 'find clientes where nome = joao order by created_at desc limit 10',
      },
    },
    required: ['q'],
  }

  spec.paths['/query'] = {
    post: {
      tags: ['Query'],
      summary: 'Executar query (POST)',
      description: 'Buscar dados usando a linguagem de query do Nexus. Exemplos: find users, find orders where total > 100',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: querySchema } },
      },
      responses: {
        200: {
          description: 'Resultados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    get: {
      tags: ['Query'],
      summary: 'Executar query (GET)',
      parameters: [{
        name: 'q',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'Query em linguagem Nexus',
        example: 'find clientes limit 10',
      }],
      responses: {
        200: {
          description: 'Resultados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  }

  return spec
}

/**
 * Generate Swagger UI HTML page
 * @param {object} spec - OpenAPI spec
 * @returns {string} HTML
 */
export function getSwaggerHTML(spec) {
  const specJson = JSON.stringify(spec)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #1a1a2e }
    .swagger-ui { max-width: 1200px; margin: 0 auto }
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #6366f1 }
    .nexus-header {
      background: #111113; border-bottom: 1px solid #27272a;
      padding: 12px 24px; display: flex; align-items: center; gap: 12px;
    }
    .nexus-header .logo { color: #6366f1; font-weight: 700; font-size: 16px; font-family: -apple-system, sans-serif }
    .nexus-header .badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: #6366f120; color: #6366f1; font-weight: 600 }
    .nexus-header a { color: #71717a; text-decoration: none; font-size: 13px; margin-left: auto; font-family: -apple-system, sans-serif }
    .nexus-header a:hover { color: #6366f1 }
  </style>
</head>
<body>
  <div class="nexus-header">
    <span class="logo">NEXUS</span>
    <span class="badge">API DOCS</span>
    <a href="/_nexus">Dashboard</a>
    <a href="/_studio" style="margin-left:12px">Studio</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    })
  </script>
</body>
</html>`
}
