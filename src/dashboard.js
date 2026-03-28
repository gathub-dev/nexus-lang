/**
 * Nexus Dashboard
 * Interface visual acessível em http://localhost:3000/_nexus
 * Só disponível em NODE_ENV !== production
 */

export function getDashboardHTML(ast, port) {
  const entitiesJson = JSON.stringify(ast.entities)
  const intentsJson  = JSON.stringify(ast.intents.map(i => ({
    name: i.name,
    auth: i.actions.find(a => a.type === 'authorize')?.raw ?? 'authenticated',
    require: i.actions.find(a => a.type === 'require')?.fields ?? [],
  })))
  const eventsJson = JSON.stringify(ast.events.map(e => e.name))

  return /* html */`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

    :root {
      --bg: #0f0f13;
      --surface: #18181f;
      --border: #2a2a35;
      --accent: #6366f1;
      --accent-dim: #6366f120;
      --green: #22c55e;
      --red: #ef4444;
      --yellow: #eab308;
      --text: #e2e2e8;
      --muted: #6b6b7b;
      --code: #a78bfa;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 10;
    }

    .logo {
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: -0.5px;
    }

    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 99px;
      background: var(--accent-dim);
      color: var(--accent);
      font-weight: 600;
    }

    .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--green);
      margin-left: auto;
      box-shadow: 0 0 6px var(--green);
    }

    .layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      min-height: calc(100vh - 57px);
    }

    nav {
      border-right: 1px solid var(--border);
      padding: 16px 0;
      position: sticky;
      top: 57px;
      height: calc(100vh - 57px);
      overflow-y: auto;
    }

    .nav-section {
      padding: 4px 16px;
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
      margin-bottom: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      cursor: pointer;
      border-radius: 0;
      color: var(--muted);
      transition: all 0.1s;
      font-size: 13px;
    }

    .nav-item:hover { background: var(--surface); color: var(--text) }
    .nav-item.active { background: var(--accent-dim); color: var(--accent) }

    .nav-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }

    main {
      padding: 24px;
      overflow-y: auto;
    }

    .page { display: none }
    .page.active { display: block }

    h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th {
      text-align: left;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none }

    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
    }

    .tag-text    { background: #1e3a5f; color: #60a5fa }
    .tag-number  { background: #1a3a2a; color: #4ade80 }
    .tag-boolean { background: #3a2a1a; color: #fb923c }
    .tag-enum    { background: #2a1a3a; color: #c084fc }
    .tag-rel     { background: #1a2a3a; color: #38bdf8 }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }

    .pill-public  { background: #1a3a1a; color: var(--green) }
    .pill-auth    { background: #3a3a1a; color: var(--yellow) }
    .pill-role    { background: #3a1a1a; color: var(--red) }

    /* Form de teste */
    .form-group { margin-bottom: 12px }
    label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px }

    input, textarea, select {
      width: 100%;
      padding: 8px 10px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 13px;
      font-family: monospace;
      outline: none;
      transition: border-color 0.1s;
    }

    input:focus, textarea:focus, select:focus {
      border-color: var(--accent);
    }

    textarea { resize: vertical; min-height: 100px }

    button {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.1s;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-primary:hover { opacity: 0.85 }
    .btn-primary:active { transform: scale(0.98) }

    .btn-ghost {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent) }

    .response {
      margin-top: 16px;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 300px;
      overflow-y: auto;
      display: none;
    }

    .response.success { border-color: var(--green); color: var(--green) }
    .response.error   { border-color: var(--red); color: var(--red) }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr }
      nav { display: none }
      .grid-2 { grid-template-columns: 1fr }
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label { font-size: 12px; color: var(--muted) }

    code {
      font-family: monospace;
      font-size: 12px;
      background: var(--bg);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--code);
    }

    .actions-list { list-style: none }
    .actions-list li {
      padding: 4px 0;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .token-display {
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      color: var(--code);
      padding: 8px;
      background: var(--bg);
      border-radius: 4px;
      border: 1px solid var(--border);
      margin-top: 8px;
    }
  </style>
</head>
<body>

<header>
  <span class="logo">NEXUS</span>
  <span class="badge">DEV</span>
  <span style="color: var(--muted); font-size: 12px">localhost:${port}</span>
  <div class="status-dot" id="statusDot" title="Verificando..."></div>
</header>

<div class="layout">
  <nav>
    <div class="nav-section">Visão Geral</div>
    <div class="nav-item active" onclick="showPage('overview', this)">
      <div class="nav-dot"></div> Overview
    </div>

    <div class="nav-section">Schema</div>
    <div id="nav-entities"></div>

    <div class="nav-section">API</div>
    <div class="nav-item" onclick="showPage('intents', this)">
      <div class="nav-dot"></div> Intents
    </div>
    <div class="nav-item" onclick="showPage('query', this)">
      <div class="nav-dot"></div> Query
    </div>

    <div class="nav-section">Ferramentas</div>
    <div class="nav-item" onclick="showPage('auth', this)">
      <div class="nav-dot"></div> Auth / Token
    </div>
  </nav>

  <main>

    <!-- OVERVIEW -->
    <div class="page active" id="page-overview">
      <h2>Overview</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value" id="stat-entities">0</div>
          <div class="stat-label">Entidades</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-intents">0</div>
          <div class="stat-label">Intents</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-events">0</div>
          <div class="stat-label">Eventos</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Entidades</div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Campos</th>
              <th>Relações</th>
            </tr>
          </thead>
          <tbody id="overview-entities"></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title">Intents disponíveis</div>
        <table>
          <thead>
            <tr>
              <th>Intent</th>
              <th>Auth</th>
              <th>Campos obrigatórios</th>
              <th>Endpoint</th>
            </tr>
          </thead>
          <tbody id="overview-intents"></tbody>
        </table>
      </div>
    </div>

    <!-- ENTITIES DINÂMICAS -->
    <div id="entity-pages"></div>

    <!-- INTENTS -->
    <div class="page" id="page-intents">
      <h2>Testar Intents</h2>
      <div id="intents-list"></div>
    </div>

    <!-- QUERY -->
    <div class="page" id="page-query">
      <h2>Query</h2>
      <div class="card">
        <div class="card-title">Executar query</div>
        <div class="form-group">
          <label>Token JWT (opcional)</label>
          <input id="query-token" placeholder="Bearer eyJ..." />
        </div>
        <div class="form-group">
          <label>Query</label>
          <input id="query-input" placeholder="find users where role = admin order by created_at desc limit 10" />
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px">
          <button class="btn-ghost" onclick="setQuery('find users')">find users</button>
          <button class="btn-ghost" onclick="setQuery('find users limit 5')">find users limit 5</button>
          <button class="btn-ghost" id="qex1"></button>
        </div>
        <button class="btn-primary" onclick="runQuery()">Executar</button>
        <div class="response" id="query-response"></div>
      </div>

      <div class="card">
        <div class="card-title">Sintaxe</div>
        <table>
          <thead><tr><th>Exemplo</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>find users</code></td><td>Todos os usuários (limit 100)</td></tr>
            <tr><td><code>find orders where total &gt; 100</code></td><td>Filtro numérico</td></tr>
            <tr><td><code>find orders where status = paid</code></td><td>Filtro de texto</td></tr>
            <tr><td><code>find orders where status = paid and total &gt; 50</code></td><td>Múltiplos filtros</td></tr>
            <tr><td><code>find orders order by total desc limit 10</code></td><td>Ordenação e limite</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- AUTH -->
    <div class="page" id="page-auth">
      <h2>Auth / Token</h2>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Gerar token</div>
          <div class="form-group">
            <label>ID do usuário</label>
            <input id="auth-id" value="1" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <input id="auth-role" value="admin" />
          </div>
          <button class="btn-primary" onclick="getToken()">Gerar</button>
          <div class="token-display" id="token-display" style="display:none"></div>
        </div>

        <div class="card">
          <div class="card-title">Como usar</div>
          <p style="color:var(--muted); font-size:13px; margin-bottom:12px">
            Adicione o token no header de qualquer requisição:
          </p>
          <code style="display:block; padding:8px; background:var(--bg); border-radius:4px; font-size:12px; line-height:1.8">
            Authorization: Bearer &lt;token&gt;
          </code>
          <p style="color:var(--muted); font-size:12px; margin-top:12px">
            Em produção, defina <code>NEXUS_JWT_SECRET</code> no .env
          </p>
        </div>
      </div>
    </div>

  </main>
</div>

<script>
const ENTITIES = ${entitiesJson}
const INTENTS  = ${intentsJson}
const EVENTS   = ${eventsJson}
const PORT     = ${port}

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------

function init() {
  // stats
  document.getElementById('stat-entities').textContent = ENTITIES.length
  document.getElementById('stat-intents').textContent = INTENTS.length
  document.getElementById('stat-events').textContent = EVENTS.length

  // nav entities
  const navEntities = document.getElementById('nav-entities')
  ENTITIES.forEach(e => {
    const div = document.createElement('div')
    div.className = 'nav-item'
    div.innerHTML = '<div class="nav-dot"></div> ' + e.name
    div.onclick = () => showPage('entity-' + e.name, div)
    navEntities.appendChild(div)
  })

  renderOverviewEntities()
  renderOverviewIntents()
  renderEntityPages()
  renderIntentForms()
  renderQueryExamples()
  checkHealth()
  setInterval(checkHealth, 5000)
}

// ----------------------------------------------------------------
// Render
// ----------------------------------------------------------------

function fieldTag(field) {
  const t = field.type
  if (t === 'relation') return '<span class="tag tag-rel">→ ' + field.relation + '</span>'
  if (t === 'enum')     return '<span class="tag tag-enum">enum</span>'
  if (t === 'number')   return '<span class="tag tag-number">number</span>'
  if (t === 'boolean')  return '<span class="tag tag-boolean">boolean</span>'
  return '<span class="tag tag-text">text</span>'
}

function authPill(auth) {
  if (auth === 'public') return '<span class="pill pill-public">public</span>'
  if (auth === 'authenticated') return '<span class="pill pill-auth">auth</span>'
  return '<span class="pill pill-role">role(' + auth.replace('role(','').replace(')','') + ')</span>'
}

function renderOverviewEntities() {
  const tbody = document.getElementById('overview-entities')
  ENTITIES.forEach(e => {
    const fields = e.fields.filter(f => f.type !== 'relation').length
    const rels = e.fields.filter(f => f.type === 'relation').length
    tbody.innerHTML += '<tr>' +
      '<td><strong>' + e.name + '</strong></td>' +
      '<td>' + fields + ' campos</td>' +
      '<td>' + (rels > 0 ? rels + ' relações' : '—') + '</td>' +
      '</tr>'
  })
}

function renderOverviewIntents() {
  const tbody = document.getElementById('overview-intents')
  INTENTS.forEach(i => {
    const slug = i.name.replace(/\\s+/g, '-')
    tbody.innerHTML += '<tr>' +
      '<td><strong>' + i.name + '</strong></td>' +
      '<td>' + authPill(i.auth) + '</td>' +
      '<td><code>' + (i.require.join(', ') || '—') + '</code></td>' +
      '<td><code>POST /intent/' + slug + '</code></td>' +
      '</tr>'
  })
}

function renderEntityPages() {
  const container = document.getElementById('entity-pages')
  ENTITIES.forEach(e => {
    const div = document.createElement('div')
    div.className = 'page'
    div.id = 'page-entity-' + e.name

    const rows = e.fields.map(f => {
      const mods = []
      if (f.required) mods.push('<span style="color:var(--red);font-size:11px">required</span>')
      if (f.unique)   mods.push('<span style="color:var(--yellow);font-size:11px">unique</span>')
      if (f.enumValues) mods.push('<span style="color:var(--muted);font-size:11px">' + f.enumValues.join(' | ') + '</span>')
      return '<tr>' +
        '<td><code>' + f.name + '</code></td>' +
        '<td>' + fieldTag(f) + '</td>' +
        '<td>' + (mods.join(' ') || '—') + '</td>' +
        '</tr>'
    }).join('')

    div.innerHTML = '<h2>' + e.name + '</h2>' +
      '<div class="card">' +
        '<div class="card-title">Campos</div>' +
        '<table><thead><tr><th>Campo</th><th>Tipo</th><th>Modificadores</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
      '</div>'
    container.appendChild(div)
  })
}

function renderIntentForms() {
  const container = document.getElementById('intents-list')
  INTENTS.forEach(i => {
    const slug = i.name.replace(/\\s+/g, '-')
    const id = 'intent-' + slug

    const fields = i.require.map(f =>
      '<div class="form-group">' +
        '<label>' + f + '</label>' +
        '<input id="' + id + '-' + f + '" placeholder="' + f + '" />' +
      '</div>'
    ).join('')

    container.innerHTML += '<div class="card">' +
      '<div class="card-title">' +
        i.name + ' ' + authPill(i.auth) +
        '<code style="margin-left:auto;font-size:11px">POST /intent/' + slug + '</code>' +
      '</div>' +
      '<div class="form-group"><label>Token JWT</label>' +
        '<input id="' + id + '-token" placeholder="Bearer eyJ... (se necessário)" />' +
      '</div>' +
      fields +
      '<div class="form-group"><label>Body JSON extra (opcional)</label>' +
        '<textarea id="' + id + '-extra" placeholder=\'{"campo": "valor"}\'></textarea>' +
      '</div>' +
      '<button class="btn-primary" onclick="runIntent(\'' + slug + '\', \'' + id + '\', ' + JSON.stringify(i.require) + ')">Executar</button>' +
      '<div class="response" id="' + id + '-resp"></div>' +
    '</div>'
  })
}

function renderQueryExamples() {
  if (ENTITIES.length > 0) {
    const e = ENTITIES[0].name.toLowerCase()
    const btn = document.getElementById('qex1')
    btn.textContent = 'find ' + e + ' limit 5'
    btn.onclick = () => setQuery('find ' + e + ' limit 5')
  }
}

// ----------------------------------------------------------------
// Actions
// ----------------------------------------------------------------

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.getElementById('page-' + name)?.classList.add('active')
  el?.classList.add('active')
}

async function checkHealth() {
  const dot = document.getElementById('statusDot')
  try {
    const r = await fetch('/health')
    dot.style.background = r.ok ? 'var(--green)' : 'var(--red)'
    dot.style.boxShadow = r.ok ? '0 0 6px var(--green)' : '0 0 6px var(--red)'
  } catch {
    dot.style.background = 'var(--red)'
    dot.style.boxShadow = '0 0 6px var(--red)'
  }
}

async function runIntent(slug, id, fields) {
  const token = document.getElementById(id + '-token')?.value?.trim()
  const resp = document.getElementById(id + '-resp')

  const body = {}
  fields.forEach(f => {
    const val = document.getElementById(id + '-' + f)?.value?.trim()
    if (val) body[f] = val
  })

  const extra = document.getElementById(id + '-extra')?.value?.trim()
  if (extra) {
    try { Object.assign(body, JSON.parse(extra)) }
    catch { resp.textContent = 'Body JSON inválido'; resp.className = 'response error'; resp.style.display='block'; return }
  }

  resp.style.display = 'block'
  resp.className = 'response'
  resp.textContent = 'Enviando...'

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : 'Bearer ' + token

    const r = await fetch('/intent/' + slug, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    const data = await r.json()
    resp.textContent = JSON.stringify(data, null, 2)
    resp.className = 'response ' + (r.ok ? 'success' : 'error')
  } catch (e) {
    resp.textContent = e.message
    resp.className = 'response error'
  }
}

async function runQuery() {
  const q = document.getElementById('query-input').value.trim()
  const token = document.getElementById('query-token').value.trim()
  const resp = document.getElementById('query-response')

  if (!q) return

  resp.style.display = 'block'
  resp.className = 'response'
  resp.textContent = 'Executando...'

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : 'Bearer ' + token

    const r = await fetch('/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ q })
    })
    const data = await r.json()
    resp.textContent = JSON.stringify(data, null, 2)
    resp.className = 'response ' + (r.ok ? 'success' : 'error')
  } catch (e) {
    resp.textContent = e.message
    resp.className = 'response error'
  }
}

async function getToken() {
  const id = document.getElementById('auth-id').value
  const role = document.getElementById('auth-role').value
  const display = document.getElementById('token-display')

  try {
    const r = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role })
    })
    const data = await r.json()
    display.style.display = 'block'
    display.textContent = data.token ?? JSON.stringify(data)
  } catch (e) {
    display.style.display = 'block'
    display.textContent = e.message
  }
}

function setQuery(q) {
  document.getElementById('query-input').value = q
}

init()
</script>
</body>
</html>`
}
