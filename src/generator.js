/**
 * Nexus Generator
 * Usa Claude API para gerar codigo .nexus a partir de descricao em linguagem natural
 */

import Anthropic from '@anthropic-ai/sdk'
import { parseNexus, ParseError } from './parser.js'
import { validateAST, ValidationError } from './validator.js'

const SYSTEM_PROMPT = `Voce e o Nexus AI — um assistente que gera codigo na linguagem Nexus (.nexus) para criar backends automaticamente.

## Sintaxe da linguagem Nexus:

### Entidades (tabelas do banco):
\`\`\`
NomeDaEntidade:
  campo text required
  campo text unique required
  campo number
  campo boolean
  campo enum(valor1, valor2, valor3)
  campo -> OutraEntidade required
\`\`\`

### Tipos de campo:
- text — texto/string
- number — numero inteiro
- boolean — verdadeiro/falso
- enum(a, b, c) — valor fixo entre opcoes
- -> Entidade — relacao/chave estrangeira

### Modificadores:
- required — campo obrigatorio
- unique — valor unico (nao repete)

### Intents (operacoes/rotas da API):
\`\`\`
intent nome da operacao:
  authorize public          # sem autenticacao
  authorize role(admin)     # so admin
  require campo1, campo2    # campos obrigatorios
  save NomeDaEntidade       # salva no banco
  emit NomeDoEvento         # dispara evento
\`\`\`

### Eventos:
\`\`\`
event NomeDoEvento:
  log "mensagem"
\`\`\`

### Regras IMPORTANTES:
1. Nomes de entidades DEVEM comecar com letra maiuscula (ex: Cliente, Produto)
2. Nomes de campos sao em minusculo sem acentos (ex: nome, telefone, datanascimento)
3. Nomes de intents podem ter espacos (ex: intent criar cliente:)
4. Relacoes usam -> seguido do nome da entidade
5. Comentarios comecam com #
6. Indentacao e obrigatoria (2 espacos) para campos e acoes
7. NUNCA use acentos em nomes de campos ou entidades
8. Cada entidade deve ter pelo menos 1 campo
9. Cada intent deve ter pelo menos 1 acao "save"
10. NUNCA use palavras reservadas SQL como nomes (select, insert, update, delete, drop, create, table, etc)

### Exemplo completo:
\`\`\`
# Sistema de Barbearia

Cliente:
  nome text required
  email text unique required
  telefone text

Servico:
  nome text required
  preco number required
  duracao number

Barbeiro:
  nome text required
  especialidade text

Agendamento:
  cliente -> Cliente required
  barbeiro -> Barbeiro required
  servico -> Servico required
  data text required
  horario text required
  status enum(agendado, confirmado, concluido, cancelado)

intent cadastrar cliente:
  authorize public
  require nome, email
  save Cliente
  emit ClienteCadastrado

intent adicionar servico:
  authorize role(admin)
  require nome, preco
  save Servico

intent adicionar barbeiro:
  authorize role(admin)
  require nome
  save Barbeiro

intent agendar horario:
  require cliente, servico, barbeiro, data, horario
  save Agendamento
  emit AgendamentoCriado

event ClienteCadastrado:
  log "novo cliente cadastrado"

event AgendamentoCriado:
  log "novo agendamento criado"
\`\`\`

## Instrucoes:
- Responda SEMPRE em portugues
- Quando o usuario descrever um sistema, gere o codigo .nexus completo
- Coloque o codigo .nexus dentro de um bloco \\\`\\\`\\\`nexus ... \\\`\\\`\\\`
- Apos o codigo, explique brevemente o que foi criado (entidades, intents, eventos)
- Se o usuario pedir modificacoes, gere o codigo .nexus COMPLETO atualizado (nao parcial)
- Crie intents logicos para cada entidade (criar, atualizar quando fizer sentido)
- Sempre adicione eventos relevantes
- Use authorize public para operacoes abertas (cadastro)
- Use authorize role(admin) para operacoes administrativas
- Sem authorize = requer autenticacao basica (token JWT)
- NUNCA crie intents de login/autenticacao — o Nexus ja tem POST /auth/token automatico
- NUNCA use acentos nos nomes de campos
- Todo intent com save DEVE referenciar uma entidade que existe no schema
- Intents podem existir sem save (ex: para emit ou log apenas)
- Sempre gere um sistema COMPLETO e funcional`

/**
 * Gera codigo .nexus usando Claude API
 * @param {string} apiKey - Anthropic API key
 * @param {Array<{role: string, content: string}>} messages - historico do chat
 * @returns {Promise<{message: string, nexusCode: string|null}>}
 */
export async function generateNexus(apiKey, messages) {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY nao configurada')
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  })

  const text = response.content[0]?.text ?? ''

  // extrair codigo .nexus da resposta
  const nexusCode = extractNexusCode(text)

  return {
    message: text,
    nexusCode,
  }
}

/**
 * Extrai bloco de codigo .nexus da resposta do Claude
 */
function extractNexusCode(text) {
  // tenta encontrar bloco ```nexus ... ```
  const nexusMatch = text.match(/```nexus\n([\s\S]*?)```/)
  if (nexusMatch) return nexusMatch[1].trim()

  // tenta encontrar bloco ``` ... ``` generico que parece .nexus
  const codeMatch = text.match(/```\n([\s\S]*?)```/)
  if (codeMatch) {
    const code = codeMatch[1].trim()
    // verifica se parece .nexus (tem entidades com ":" e campos indentados)
    if (/^[A-Z]\w+:$/m.test(code)) return code
  }

  return null
}

/**
 * Valida se o codigo .nexus gerado e valido
 * @param {string} code
 * @returns {{ valid: boolean, error?: string, ast?: object }}
 */
export function validateNexusCode(code) {
  try {
    const ast = parseNexus(code)
    validateAST(ast)
    return {
      valid: true,
      ast,
      stats: {
        entities: ast.entities.length,
        intents: ast.intents.length,
        events: ast.events.length,
        fields: ast.entities.reduce((sum, e) => sum + e.fields.length, 0),
      }
    }
  } catch (err) {
    return {
      valid: false,
      error: err.message,
    }
  }
}
