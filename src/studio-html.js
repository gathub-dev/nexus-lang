/**
 * Nexus Studio
 * Interface visual tipo Lovable.dev para criar sistemas via chat
 */

export function getStudioHTML() {
  return `<!DOCTYPE html>
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
      --green: #22c55e;
      --red: #ef4444;
      --text: #fafafa;
      --muted: #71717a;
    }

    html, body { height: 100%; overflow: hidden }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }

    /* ====== HEADER ====== */
    .header {
      height: 56px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 12px;
      background: var(--surface);
      flex-shrink: 0;
    }
    .logo { font-size: 16px; font-weight: 700; color: var(--accent) }
    .logo-sub { font-size: 13px; color: var(--muted); font-weight: 400 }
    .header-right { margin-left: auto; display: flex; align-items: center; gap: 10px }

    .btn {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: all 0.15s;
      display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
    }
    .btn-deploy { background: var(--green); color: #000 }
    .btn-deploy:hover { opacity: 0.9 }
    .btn-deploy:disabled { opacity: 0.4; cursor: not-allowed }
    .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border) }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent) }

    /* ====== LAYOUT ====== */
    .app { display: flex; flex-direction: column; height: 100vh }
    .main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      flex: 1;
      min-height: 0; /* CRITICAL: allows children to scroll */
    }

    /* ====== CHAT ====== */
    .chat-panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      min-height: 0; /* CRITICAL */
      overflow: hidden;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
      min-height: 0; /* CRITICAL */
    }
    .chat-messages::-webkit-scrollbar { width: 6px }
    .chat-messages::-webkit-scrollbar-track { background: transparent }
    .chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px }

    /* Welcome */
    .welcome { text-align: center; padding: 40px 30px; color: var(--muted) }
    .welcome h2 { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 8px }
    .welcome p { font-size: 14px; margin-bottom: 20px; max-width: 380px; margin-left: auto; margin-right: auto }
    .welcome-examples { display: flex; flex-direction: column; gap: 8px; max-width: 380px; margin: 0 auto }
    .welcome-example {
      padding: 10px 14px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; cursor: pointer; text-align: left; font-size: 13px;
      color: var(--muted); transition: all 0.15s;
    }
    .welcome-example:hover { border-color: var(--accent); color: var(--text); background: var(--surface2) }

    /* Messages */
    .msg { display: flex; gap: 10px; flex-shrink: 0 }
    .msg-user { align-self: flex-end; flex-direction: row-reverse; max-width: 80% }
    .msg-bot { align-self: flex-start; max-width: 85% }

    .msg-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
    }
    .msg-user .msg-avatar { background: var(--accent); color: white }
    .msg-bot .msg-avatar { background: var(--green); color: #000 }

    .msg-bubble {
      padding: 12px 16px; border-radius: 16px; font-size: 13px;
      line-height: 1.7; word-wrap: break-word; overflow-wrap: break-word;
    }
    .msg-user .msg-bubble {
      background: var(--accent); color: white;
      border-bottom-right-radius: 4px;
    }
    .msg-bot .msg-bubble {
      background: var(--surface2); color: var(--text);
      border-bottom-left-radius: 4px; border: 1px solid var(--border);
      white-space: pre-wrap;
    }

    /* Typing dots */
    .typing-dots { display: inline-flex; gap: 4px; padding: 4px 0 }
    .typing-dots span {
      width: 7px; height: 7px; border-radius: 50%; background: var(--muted);
      animation: bounce 1.4s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s }
    @keyframes bounce { 0%,80%,100% { transform: scale(0) } 40% { transform: scale(1) } }

    /* Chat input */
    .chat-input-area {
      padding: 16px 20px; border-top: 1px solid var(--border);
      background: var(--surface); flex-shrink: 0;
    }
    .chat-input-wrapper { display: flex; gap: 8px; align-items: flex-end }
    .chat-input {
      flex: 1; background: var(--bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 12px 16px; color: var(--text);
      font-size: 14px; font-family: inherit; resize: none; outline: none;
      min-height: 44px; max-height: 120px; transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: var(--accent) }
    .chat-input::placeholder { color: var(--muted) }

    .btn-send {
      width: 44px; height: 44px; border-radius: 12px; background: var(--accent);
      color: white; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; flex-shrink: 0;
    }
    .btn-send:hover { opacity: 0.85 }
    .btn-send:disabled { opacity: 0.3; cursor: not-allowed }

    /* ====== PREVIEW ====== */
    .preview-panel {
      display: flex; flex-direction: column;
      background: var(--surface); min-height: 0; overflow: hidden;
    }
    .preview-header {
      padding: 12px 20px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--muted); flex-shrink: 0;
    }
    .preview-tab { padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s }
    .preview-tab.active { background: var(--accent-dim); color: var(--accent) }
    .preview-tab:hover:not(.active) { color: var(--text) }

    .preview-content {
      flex: 1; overflow-y: auto; padding: 20px; min-height: 0;
    }
    .preview-content::-webkit-scrollbar { width: 6px }
    .preview-content::-webkit-scrollbar-track { background: transparent }
    .preview-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px }

    .code-preview {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px; line-height: 1.8; white-space: pre-wrap; tab-size: 2;
    }
    .empty-preview { text-align: center; padding: 60px 30px; color: var(--muted) }
    .empty-preview h3 { font-size: 16px; color: var(--text); margin-bottom: 8px }

    /* Syntax highlighting */
    .hl-entity { color: #38bdf8; font-weight: 600 }
    .hl-type { color: #4ade80 }
    .hl-mod { color: #fb923c }
    .hl-keyword { color: #f472b6; font-weight: 600 }
    .hl-comment { color: #52525b; font-style: italic }
    .hl-string { color: #fbbf24 }
    .hl-relation { color: #38bdf8 }

    /* Stats bar */
    .stats-bar {
      padding: 10px 20px; border-top: 1px solid var(--border);
      display: flex; gap: 20px; font-size: 12px; color: var(--muted);
      background: var(--bg); flex-shrink: 0;
    }
    .stat-item { display: flex; align-items: center; gap: 6px }
    .stat-dot { width: 6px; height: 6px; border-radius: 50% }

    /* Routes */
    .routes-list { display: flex; flex-direction: column; gap: 8px }
    .route-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; font-size: 12px; font-family: monospace;
    }
    .route-method { padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px }
    .method-post { background: #1a3a1a; color: var(--green) }
    .method-get { background: #1e3a5f; color: #60a5fa }
    .route-auth { margin-left: auto; font-size: 11px }
    .auth-public { color: var(--green) }
    .auth-protected { color: var(--muted) }
    .auth-admin { color: var(--red) }

    /* Toast */
    .toast {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: 12px 24px; border-radius: 10px;
      font-size: 13px; font-weight: 600; z-index: 100;
      transition: transform 0.3s ease;
    }
    .toast.show { transform: translateX(-50%) translateY(0) }
    .toast-success { background: var(--green); color: #000 }
    .toast-error { background: var(--red); color: white }

    /* Deploy overlay */
    .deploy-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: none; align-items: center; justify-content: center; z-index: 50;
    }
    .deploy-overlay.show { display: flex }
    .deploy-modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 32px; text-align: center; max-width: 400px;
    }
    .deploy-modal h3 { font-size: 18px; margin-bottom: 8px }
    .deploy-modal p { color: var(--muted); margin-bottom: 20px; font-size: 13px }
    .spinner {
      width: 40px; height: 40px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg) } }

    @media (max-width: 900px) {
      .main { grid-template-columns: 1fr }
      .preview-panel { display: none }
    }
  </style>
</head>
<body>
<div class="app">

<div class="header">
  <span class="logo">NEXUS <span class="logo-sub">Studio</span></span>
  <div class="header-right">
    <input type="text" id="projectNameInput" placeholder="nome-do-projeto" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;width:180px;outline:none">
    <button class="btn btn-deploy" id="btnDeploy" disabled onclick="downloadProject()">Baixar Projeto</button>
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
      <div class="stat-item"><div class="stat-dot" style="background:var(--accent)"></div><span id="statEntities">0</span> entidades</div>
      <div class="stat-item"><div class="stat-dot" style="background:var(--green)"></div><span id="statIntents">0</span> intents</div>
      <div class="stat-item"><div class="stat-dot" style="background:#fbbf24"></div><span id="statEvents">0</span> eventos</div>
    </div>
  </div>
</div>

</div>

<div class="deploy-overlay" id="deployOverlay">
  <div class="deploy-modal">
    <div class="spinner" id="deploySpinner"></div>
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

function sendExample(el) {
  document.getElementById('chatInput').value = el.textContent
  sendMessage()
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

function autoResize(el) {
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function scrollToBottom() {
  const el = document.getElementById('chatMessages')
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
}

async function sendMessage() {
  const input = document.getElementById('chatInput')
  const text = input.value.trim()
  if (!text || isLoading) return

  const welcome = document.getElementById('welcome')
  if (welcome) welcome.remove()

  addMessage('user', text)
  chatHistory.push({ role: 'user', content: text })
  input.value = ''
  input.style.height = 'auto'

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
      let displayMsg = data.message || ''
      // remove code blocks from chat display
      displayMsg = displayMsg.replace(/\`\`\`nexus[\\s\\S]*?\`\`\`/g, '')
      displayMsg = displayMsg.replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '')
      displayMsg = displayMsg.trim()
      if (!displayMsg) displayMsg = 'Sistema gerado com sucesso! Veja o codigo ao lado e clique em "Criar Sistema" quando estiver pronto.'

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
  scrollToBottom()
}

function addMessage(role, text) {
  const container = document.getElementById('chatMessages')
  const div = document.createElement('div')
  div.className = 'msg msg-' + role

  const avatar = role === 'user' ? 'V' : 'N'
  const bubbleEl = document.createElement('div')
  bubbleEl.className = 'msg-bubble'
  bubbleEl.textContent = text

  div.innerHTML = '<div class="msg-avatar">' + avatar + '</div>'
  div.appendChild(bubbleEl)
  container.appendChild(div)
  scrollToBottom()
  return div
}

function addLoading() {
  const container = document.getElementById('chatMessages')
  const div = document.createElement('div')
  div.className = 'msg msg-bot'
  div.innerHTML = '<div class="msg-avatar">N</div>' +
    '<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>'
  container.appendChild(div)
  scrollToBottom()
  return div
}

function escapeHtml(t) {
  const d = document.createElement('div')
  d.textContent = t
  return d.innerHTML
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
  document.getElementById('codePreview').innerHTML = highlightNexus(code)
  if (validation && validation.stats) {
    document.getElementById('statEntities').textContent = validation.stats.entities
    document.getElementById('statIntents').textContent = validation.stats.intents
    document.getElementById('statEvents').textContent = validation.stats.events
  }
  updateRoutes(code)
}

function highlightNexus(code) {
  return code.split('\\n').map(function(line) {
    var trimmed = line.trim()
    if (trimmed.startsWith('#'))
      return '<span class="hl-comment">' + escapeHtml(line) + '</span>'
    if (/^[A-Z]\\w+:$/.test(trimmed))
      return '<span class="hl-entity">' + escapeHtml(line) + '</span>'
    if (trimmed.startsWith('intent ') || trimmed.startsWith('event '))
      return '<span class="hl-keyword">' + escapeHtml(line) + '</span>'
    if (/^(authorize|require|save|emit|log|custom)/.test(trimmed)) {
      var h = escapeHtml(line)
      h = h.replace(/(authorize|require|save|emit|log|custom)/g, '<span class="hl-keyword">$1</span>')
      h = h.replace(/(public|authenticated)/g, '<span class="hl-string">$1</span>')
      h = h.replace(/role\\([^)]+\\)/g, '<span class="hl-string">$&</span>')
      h = h.replace(/"[^"]*"/g, '<span class="hl-string">$&</span>')
      return h
    }
    if (/^\\w/.test(trimmed) === false && trimmed.length > 0) {
      var h = escapeHtml(line)
      h = h.replace(/\\b(text|number|boolean)\\b/g, '<span class="hl-type">$1</span>')
      h = h.replace(/enum\\([^)]+\\)/g, '<span class="hl-type">$&</span>')
      h = h.replace(/\\b(required|unique)\\b/g, '<span class="hl-mod">$1</span>')
      h = h.replace(/-&gt; \\w+/g, '<span class="hl-relation">$&</span>')
      return h
    }
    return escapeHtml(line)
  }).join('\\n')
}

function updateRoutes(code) {
  var container = document.getElementById('routesPreview')
  container.innerHTML = ''
  var routes = [
    { method: 'GET', path: '/health', auth: 'public' },
    { method: 'POST', path: '/auth/token', auth: 'public' },
    { method: 'GET', path: '/_nexus', auth: 'public' },
  ]
  var lines = code.split('\\n')
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^intent ([^:]+):/)
    if (m) {
      var name = m[1].trim()
      var slug = name.replace(/\\s+/g, '-')
      var auth = 'protected'
      for (var j = i + 1; j < lines.length && lines[j].match(/^\\s/); j++) {
        if (lines[j].includes('authorize public')) auth = 'public'
        else if (lines[j].includes('authorize role')) auth = 'admin'
      }
      routes.push({ method: 'POST', path: '/intent/' + slug, auth: auth })
    }
  }
  routes.push({ method: 'POST', path: '/query', auth: 'public' })
  routes.push({ method: 'GET', path: '/query', auth: 'public' })

  routes.forEach(function(r) {
    var div = document.createElement('div')
    div.className = 'route-item'
    var mc = r.method === 'POST' ? 'method-post' : 'method-get'
    var ac = r.auth === 'public' ? 'auth-public' : r.auth === 'admin' ? 'auth-admin' : 'auth-protected'
    var al = r.auth === 'public' ? 'public' : r.auth === 'admin' ? 'admin' : 'auth'
    div.innerHTML = '<span class="route-method ' + mc + '">' + r.method + '</span>' +
      '<span>' + r.path + '</span>' +
      '<span class="route-auth ' + ac + '">' + al + '</span>'
    container.appendChild(div)
  })
}

// ---- Deploy ----

async function downloadProject() {
  if (!currentNexusCode) return
  var projectName = document.getElementById('projectNameInput').value.trim() || 'meu-sistema'
  var overlay = document.getElementById('deployOverlay')
  document.getElementById('deployTitle').textContent = 'Gerando projeto...'
  document.getElementById('deployText').textContent = 'Empacotando arquivos para download'
  document.getElementById('deploySpinner').style.display = 'block'
  overlay.classList.add('show')
  try {
    var res = await fetch('/_studio/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: currentNexusCode, projectName: projectName })
    })
    if (!res.ok) {
      var err = await res.json()
      overlay.classList.remove('show')
      showToast('Erro: ' + (err.error || 'falha ao gerar'), 'error')
      return
    }
    var blob = await res.blob()
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    document.getElementById('deployTitle').textContent = 'Projeto baixado!'
    document.getElementById('deployText').textContent = 'Extraia o ZIP, rode npm install e npm run dev'
    document.getElementById('deploySpinner').style.display = 'none'
    showToast('Projeto baixado com sucesso!', 'success')
    setTimeout(function() { overlay.classList.remove('show') }, 2500)
  } catch (err) {
    overlay.classList.remove('show')
    showToast('Erro de conexao', 'error')
  }
}

function showToast(msg, type) {
  var toast = document.getElementById('toast')
  toast.textContent = msg
  toast.className = 'toast toast-' + type + ' show'
  setTimeout(function() { toast.classList.remove('show') }, 3000)
}
</script>
</body>
</html>`
}
