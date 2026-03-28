# nexus-lang

Backend orientado a intencao. Descreva seu sistema, o Nexus constroi.

## Quick Start

```bash
npx create-nexus-app meu-sistema
cd meu-sistema
npm install
npm run dev
```

Abra http://localhost:3000/_nexus para ver o dashboard.

## Como funciona

Voce escreve um arquivo app.nexus:

```nexus
User:
  name text required
  email text unique required
  role enum(admin, user)

Order:
  user -> User required
  total number required
  status enum(pending, paid)

intent create user:
  authorize public
  require name, email
  save User
  emit UserCreated

intent create order:
  require user_id, total
  save Order

event UserCreated:
  log "novo usuario"
```

O Nexus gera automaticamente:
- Tabelas no PostgreSQL com relacoes corretas
- API REST com rotas de cada intent
- Autenticacao JWT com roles
- Sistema de queries (find users where role = admin)
- Validacao dos campos obrigatorios
- Sistema de eventos assincronos
- Migracoes automaticas quando o schema muda
- Dashboard visual de desenvolvimento

## Comandos

```bash
nexus dev              # servidor com hot reload + dashboard
nexus start            # servidor em producao
nexus migrate          # aplica migracoes no banco
nexus migrate --dry-run # mostra plano sem executar
nexus check            # valida app.nexus
```

## API gerada

### Auth
```
POST /auth/token
{ "id": 1, "role": "admin" }
-> { "token": "eyJ..." }
```

### Intents
```
POST /intent/<nome>
Authorization: Bearer <token>
{ ...campos }
```

### Queries
```
GET  /query?q=find+users+limit+10
POST /query { "q": "find orders where status = paid order by created_at desc limit 20" }
```

### Dashboard (dev)
```
GET /_nexus
```

## Sintaxe completa

### Tipos de campo
| Tipo | Descricao |
|------|-----------|
| text | String |
| number | Inteiro |
| boolean | true/false |
| enum(a, b) | Valor fixo |
| -> Entity | Relacao/FK |

### Modificadores
| Modificador | Descricao |
|-------------|-----------|
| required | Campo obrigatorio |
| unique | Valor unico |

### Acoes de intent
| Acao | Descricao |
|------|-----------|
| save Entity | Persiste no banco |
| emit EventName | Dispara evento |
| require field1, field2 | Valida presenca |
| authorize public | Sem autenticacao |
| authorize role(admin) | So admins |
| custom js: code | Codigo custom em sandbox |

## Variaveis de ambiente

```env
DATABASE_URL=postgres://user:pass@host:5432/db
PORT=3000
NODE_ENV=development
NEXUS_JWT_SECRET=sua-chave-secreta
NEXUS_FETCH_ALLOWLIST=api.stripe.com,hooks.slack.com
NEXUS_SANDBOX_TIMEOUT=3000
```

## Requisitos

- Node.js >= 18
- PostgreSQL >= 13

## Licenca

MIT
