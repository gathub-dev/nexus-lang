/**
 * Nexus Studio
 * Interface visual tipo Lovable.dev para criar sistemas via chat
 */

export function getStudioHTML() {
  return /* html */`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Studio</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

    :root {
      --bg: #09090b;
      --surface: #111113;
      --surface2: #18181b;
      --border: #27272a;
      --accent: #6366f1;
      --accent-dim: #6366f120;
      --accent-glow: #6366f140;
      --green: #22c55e;
      --red: #ef4444;
      --text: #fafafa;
      --muted: #71717a;
      --code-bg: #1a1a2e;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      height: 100vh;
      overflow: hidden;
    }

    /* Header */
    .header {
      height: 56px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 12px;
      background: var(--surface);
    }

    .logo {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: -0.5px;
    }

    .logo-sub {
      font-size: 13px;
      color: var(--muted);
      font-weight: 400;
    }

    .header-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-deploy {
      background: var(--green);
      color: #000;
    }
    .btn-deploy:hover { opacity: 0.9; transform: scale(1.02) }
    .btn-deploy:disabled { opacity: 0.4; cursor: not-allowed; transform: none }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent) }

    .btn-dashboard {
      background: var(--accent);
      color: white;
    }
    .btn-dashboard:hover { opacity: 0.9 }

    /* Main layout */
    .main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: calc(100vh - 56px);
    }

    /* Chat panel */
    .chat-panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--bg);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chat-messages::-webkit-scrollbar { width: 6px }
    .chat-messages::-webkit-scrollbar-track { background: transparent }
    .chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px }

    .welcome {
      text-align: center;
      padding: 60px 40px;
      color: var(--muted);
    }

    .welcome h2 {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }

    .welcome p {
      font-size: 14px;
      margin-bottom: 24px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .welcome-examples {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
      margin: 0 auto;
    }

    .welcome-example {
      padding: 10px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
      color: var(--muted);
      transition: all 0.15s;
    }
    .welcome-example:hover {
      border-color: var(--accent);
      color: var(--text);
      background: var(--surface2);
    }

    .msg {
      display: flex;
      gap: 10px;
      max-width: 90%;
    }

    .msg-user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .msg-user .msg-avatar {
      background: var(--accent);
      color: white;
    }

    .msg-bot .msg-avatar {
      background: var(--green);
      color: #000;
    }

    .msg-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .msg-user .msg-bubble {
      background: var(--accent);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .msg-bot .msg-bubble {
      background: var(--surface2);
      color: var(--text);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--border);
    }

    .msg-loading .msg-bubble {
      color: var(--muted);
    }

    .typing-dots {
      display: inline-flex;
      gap: 4px;
    }
    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--muted);
      animation: bounce 1.4s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0) }
      40% { transform: scale(1) }
    }

    /* Input area */
    .chat-input-area {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    .chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .chat-input {
      flex: 1;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      min-height: 42px;
      max-height: 120px;
      transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: var(--accent) }
    .chat-input::placeholder { color: var(--muted) }

    .btn-send {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: var(--accent);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .btn-send:hover { opacity: 0.9 }
    .btn-send:disabled { opacity: 0.3; cursor: not-allowed }

    /* Preview panel */
    .preview-panel {
      display: flex;
      flex-direction: column;
      background: var(--surface);
    }

    .preview-header {
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
    }

    .preview-tab {
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preview-tab.active {
      background: var(--accent-dim);
      color: var(--accent);
    }
    .preview-tab:hover:not(.active) { color: var(--text) }

    .preview-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .preview-content::-webkit-scrollbar { width: 6px }
    .preview-content::-webkit-scrollbar-track { background: transparent }
    .preview-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px }

    .code-preview {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text);
      white-space: pre-wrap;
      tab-size: 2;
    }

    .empty-preview {
      text-align: center;
      padding: 80px 40px;
      color: var(--muted);
    }

    .empty-preview h3 {
      font-size: 16px;
      color: var(--text);
      margin-bottom: 8px;
    }

    /* Syntax highlighting */
    .hl-entity { color: #38bdf8; font-weight: 600 }
    .hl-field { color: #a78bfa }
    .hl-type { color: #4ade80 }
    .hl-mod { color: #fb923c }
    .hl-keyword { color: #f472b6; font-weight: 600 }
    .hl-comment { color: #52525b; font-style: italic }
    .hl-string { color: #fbbf24 }
    .hl-relation { color: #38bdf8 }

    /* Stats bar */
    .stats-bar {
      padding: 10px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 20px;
      font-size: 12px;
      color: var(--muted);
      background: var(--bg);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* Routes preview */
    .routes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
    }

    .route-method {
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
    }

    .method-post { background: #1a3a1a; color: var(--green) }
    .method-get { background: #1e3a5f; color: #60a5fa }

    .route-auth {
      margin-left: auto;
      font-size: 11px;
    }

    .auth-public { color: var(--green) }
    .auth-protected { color: var(--muted) }
    .auth-admin { color: var(--red) }

    /* Toast notification */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      z-index: 100;
      transition: transform 0.3s ease;
    }
    .toast.show { transform: translateX(-50%) translateY(0) }
    .toast-success { background: var(--green); color: #000 }
    .toast-error { background: var(--red); color: white }

    /* Responsive */
    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr }
      .preview-panel { display: none }
    }

    /* Deploy overlay */
    .deploy-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    .deploy-overlay.show { display: flex }

    .deploy-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 400px;
    }

    .deploy-modal h3 {
      font-size: 18px;
      margin-bottom: 8px;
    }

    .deploy-modal p {
      color: var(--muted);
      margin-bottom: 20px;
      font-size: 13px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin { to { transform: rotate(360deg) } }
  </style>
</head>
<body>

<div class="header">
  <span class="logo">NEXUS <span class="logo-sub">Studio</span></span>
  <div class="header-right">
    <a href="/_nexus" class="btn btn-ghost" id="btnDashboard" style="text-decoration:none; display:none">Dashboard</a>
    <button class="btn btn-deploy" id="btnDeploy" disabled onclick="deploy()">Criar Sistema</button>
  </div>
</div>

<div class="main">
  <div class="chat-panel">
    <div class="chat-messages" id="chatMessages">
      <div class="welcome" id="welcome">
        <h2>Descreva seu sistema</h2>
        <p>Diga o que voce precisa e eu crio automaticamente. Tudo em portugues, sem codigo.</p>
        <div class="welcome-examples">
          <div class="welcome-example" onclick="sendExample(this)">Sistema de barbearia com clientes, servicos e agendamentos</div>
          <div class="welcome-example" onclick="sendExample(this)">Loja online com produtos, pedidos e clientes</div>
          <div class="welcome-example" onclick="sendExample(this)">CRM com leads, contatos, empresas e tarefas</div>
          <div class="welcome-example" onclick="sendExample(this)">Sistema de chamados com tickets, categorias e prioridades</div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="chat-input-wrapper">
        <textarea class="chat-input" id="chatInput" placeholder="Descreva o sistema que voce quer criar..." rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
        <button class="btn-send" id="btnSend" onclick="sendMessage()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </div>

  <div class="preview-panel">
    <div class="preview-header">
      <div class="preview-tab active" onclick="showPreview('code', this)">Codigo</div>
      <div class="preview-tab" onclick="showPreview('routes', this)">Rotas</div>
    </div>
    <div class="preview-content" id="previewContent">
      <div class="empty-preview" id="emptyPreview">
        <h3>Preview</h3>
        <p>O codigo .nexus aparecera aqui conforme voce descreve seu sistema</p>
      </div>
      <div class="code-preview" id="codePreview" style="display:none"></div>
      <div class="routes-list" id="routesPreview" style="display:none"></div>
    </div>
    <div class="stats-bar" id="statsBar" style="display:none">
      <div class="stat-item"><div class="stat-dot" style="background: var(--accent)"></div> <span id="statEntities">0</span> entidades</div>
      <div class="stat-item"><div class="stat-dot" style="background: var(--green)"></div> <span id="statIntents">0</span> intents</div>
      <div class="stat-item"><div class="stat-dot" style="background: #fbbf24"></div> <span id="statEvents">0</span> eventos</div>
    </div>
  </div>
</div>

<div class="deploy-overlay" id="deployOverlay">
  <div class="deploy-modal">
    <div class="spinner"></div>
    <h3 id="deployTitle">Criando sistema...</h3>
    <p id="deployText">Gerando tabelas, rotas e configuracoes</p>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let chatHistory = []
let currentNexusCode = null
let currentPreview = 'code'
let isLoading = false

// ---- Send ----

function sendExample(el) {
  document.getElementById('chatInput').value = el.textContent
  sendMessage()
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function autoResize(el) {
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

async function sendMessage() {
  const input = document.getElementById('chatInput')
  const text = input.value.trim()
  if (!text || isLoading) return

  // hide welcome
  const welcome = document.getElementById('welcome')
  if (welcome) welcome.remove()

  // add user message
  addMessage('user', text)
  chatHistory.push({ role: 'user', content: text })
  input.value = ''
  input.style.height = 'auto'

  // loading
  isLoading = true
  document.getElementById('btnSend').disabled = true
  const loadingEl = addLoading()

  try {
    const res = await fetch('/_studio/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    })

    const data = await res.json()
    loadingEl.remove()

    if (data.error) {
      addMessage('bot', 'Erro: ' + data.error)
    } else {
      // clean the message - remove the nexus code block from display
      let displayMsg = data.message
      displayMsg = displayMsg.replace(/\\\`\\\`\\\`nexus[\\s\\S]*?\\\`\\\`\\\`/g, '').trim()
      displayMsg = displayMsg.replace(/\\\`\\\`\\\`[\\s\\S]*?\\\`\\\`\\\`/g, '').trim()
      if (!displayMsg) displayMsg = 'Sistema gerado! Veja o codigo ao lado.'

      addMessage('bot', displayMsg)
      chatHistory.push({ role: 'assistant', content: data.message })

      if (data.nexusCode) {
        currentNexusCode = data.nexusCode
        updatePreview(data.nexusCode, data.validation)
        document.getElementById('btnDeploy').disabled = false
      }
    }
  } catch (err) {
    loadingEl.remove()
    addMessage('bot', 'Erro de conexao. Verifique se o servidor esta rodando.')
  }

  isLoading = false
  document.getElementById('btnSend').disabled = false
}

// ---- Messages ----

function addMessage(role, text) {
  const container = document.getElementById('chatMessages')
  const div = document.createElement('div')
  div.className = 'msg msg-' + role

  const avatar = role === 'user' ? 'V' : 'N'
  div.innerHTML =
    '<div class="msg-avatar">' + avatar + '</div>' +
    '<div class="msg-bubble">' + escapeHtml(text) + '</div>'

  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function addLoading() {
  const container = document.getElementById('chatMessages')
  const div = document.createElement('div')
  div.className = 'msg msg-bot msg-loading'
  div.innerHTML =
    '<div class="msg-avatar">N</div>' +
    '<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>'
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---- Preview ----

function showPreview(tab, el) {
  currentPreview = tab
  document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')

  document.getElementById('codePreview').style.display = tab === 'code' ? 'block' : 'none'
  document.getElementById('routesPreview').style.display = tab === 'routes' ? 'flex' : 'none'
}

function updatePreview(code, validation) {
  document.getElementById('emptyPreview').style.display = 'none'
  document.getElementById('codePreview').style.display = currentPreview === 'code' ? 'block' : 'none'
  document.getElementById('routesPreview').style.display = currentPreview === 'routes' ? 'flex' : 'none'
  document.getElementById('statsBar').style.display = 'flex'

  // syntax highlight
  document.getElementById('codePreview').innerHTML = highlightNexus(code)

  // stats
  if (validation && validation.stats) {
    document.getElementById('statEntities').textContent = validation.stats.entities
    document.getElementById('statIntents').textContent = validation.stats.intents
    document.getElementById('statEvents').textContent = validation.stats.events
  }

  // routes
  updateRoutes(code)
}

function highlightNexus(code) {
  return code.split('\\n').map(line => {
    // comments
    if (line.trim().startsWith('#')) return '<span class="hl-comment">' + escapeHtml(line) + '</span>'
    // entity declaration
    if (/^[A-Z]\\w+:$/.test(line.trim())) return '<span class="hl-entity">' + escapeHtml(line) + '</span>'
    // intent/event
    if (line.trim().startsWith('intent ')) return '<span class="hl-keyword">' + escapeHtml(line) + '</span>'
    if (line.trim().startsWith('event ')) return '<span class="hl-keyword">' + escapeHtml(line) + '</span>'
    // actions
    if (/^\\s+(authorize|require|save|emit|log|custom)/.test(line)) {
      return line.replace(/(authorize|require|save|emit|log|custom)/, '<span class="hl-keyword">$1</span>')
        .replace(/(public|role\\(\\w+\\)|authenticated)/, '<span class="hl-string">$1</span>')
        .replace(/"([^"]*)"/, '<span class="hl-string">"$1"</span>')
    }
    // fields
    if (/^\\s+\\w+/.test(line)) {
      let hl = escapeHtml(line)
      hl = hl.replace(/(text|number|boolean)/, '<span class="hl-type">$1</span>')
      hl = hl.replace(/(enum\\([^)]+\\))/, '<span class="hl-type">$1</span>')
      hl = hl.replace(/(required|unique)/, '<span class="hl-mod">$1</span>')
      hl = hl.replace(/(-&gt; \\w+)/, '<span class="hl-relation">$1</span>')
      return hl
    }
    return escapeHtml(line)
  }).join('\\n')
}

function updateRoutes(code) {
  const container = document.getElementById('routesPreview')
  container.innerHTML = ''

  // built-in routes
  const routes = [
    { method: 'GET', path: '/health', auth: 'public' },
    { method: 'POST', path: '/auth/token', auth: 'public' },
    { method: 'GET', path: '/_nexus', auth: 'public' },
  ]

  // extract intents
  const intentMatches = code.matchAll(/^intent ([^:]+):/gm)
  for (const m of intentMatches) {
    const name = m[1].trim()
    const slug = name.replace(/\\s+/g, '-')

    // check auth
    const block = code.slice(m.index)
    const nextBlock = block.indexOf('\\nintent ') > 0 ? block.slice(0, block.indexOf('\\nintent ', 1)) : block
    let auth = 'protected'
    if (nextBlock.includes('authorize public')) auth = 'public'
    else if (nextBlock.includes('authorize role')) auth = 'admin'

    routes.push({ method: 'POST', path: '/intent/' + slug, auth })
  }

  routes.push({ method: 'POST', path: '/query', auth: 'public' })
  routes.push({ method: 'GET', path: '/query', auth: 'public' })

  routes.forEach(r => {
    const div = document.createElement('div')
    div.className = 'route-item'

    const methodClass = r.method === 'POST' ? 'method-post' : 'method-get'
    const authClass = r.auth === 'public' ? 'auth-public' : r.auth === 'admin' ? 'auth-admin' : 'auth-protected'
    const authLabel = r.auth === 'public' ? 'public' : r.auth === 'admin' ? 'admin' : 'auth'

    div.innerHTML =
      '<span class="route-method ' + methodClass + '">' + r.method + '</span>' +
      '<span>' + r.path + '</span>' +
      '<span class="route-auth ' + authClass + '">' + authLabel + '</span>'

    container.appendChild(div)
  })
}

// ---- Deploy ----

async function deploy() {
  if (!currentNexusCode) return

  const overlay = document.getElementById('deployOverlay')
  overlay.classList.add('show')

  try {
    const res = await fetch('/_studio/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: currentNexusCode })
    })

    const data = await res.json()

    if (data.ok) {
      document.getElementById('deployTitle').textContent = 'Sistema criado!'
      document.getElementById('deployText').textContent = 'Redirecionando para o dashboard...'
      document.querySelector('.spinner').style.display = 'none'
      document.getElementById('btnDashboard').style.display = 'inline-flex'
      showToast('Sistema criado com sucesso!', 'success')

      setTimeout(() => {
        overlay.classList.remove('show')
        document.querySelector('.spinner').style.display = 'block'
      }, 2000)
    } else {
      overlay.classList.remove('show')
      showToast('Erro: ' + (data.error || 'falha no deploy'), 'error')
    }
  } catch (err) {
    overlay.classList.remove('show')
    showToast('Erro de conexao', 'error')
  }
}

function showToast(msg, type) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.className = 'toast toast-' + type + ' show'
  setTimeout(() => toast.classList.remove('show'), 3000)
}
</script>
</body>
</html>`
}
