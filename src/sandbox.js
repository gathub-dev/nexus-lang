/**
 * Nexus Sandbox
 * Execução segura de código custom JS definido no .nexus
 *
 * Usa Node.js vm module com timeout e contexto restrito
 */

import vm from 'node:vm'
import { ValidationError } from './validator.js'

const TIMEOUT = parseInt(process.env.NEXUS_SANDBOX_TIMEOUT ?? '3000')

const ALLOWED_FETCH_DOMAINS = (process.env.NEXUS_FETCH_ALLOWLIST ?? '')
  .split(',')
  .map(d => d.trim())
  .filter(Boolean)

export class SandboxError extends Error {
  constructor(message) {
    super(`[sandbox] ${message}`)
  }
}

/**
 * Cria um fetch restrito que só permite domínios da allowlist
 * @returns {Function}
 */
function createSafeFetch() {
  if (ALLOWED_FETCH_DOMAINS.length === 0) {
    return () => {
      throw new SandboxError('fetch desabilitado — defina NEXUS_FETCH_ALLOWLIST para habilitar')
    }
  }

  return async (url, options) => {
    const parsed = new URL(url)
    if (!ALLOWED_FETCH_DOMAINS.includes(parsed.hostname)) {
      throw new SandboxError(
        `fetch bloqueado para "${parsed.hostname}" — domínios permitidos: ${ALLOWED_FETCH_DOMAINS.join(', ')}`
      )
    }
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
      text: () => response.text(),
    }
  }
}

/**
 * Executa código customizado em sandbox isolada
 * @param {string} code - código JS do bloco custom
 * @param {object} data - dados do request (somente leitura no sandbox)
 * @returns {Promise<{ result: object|undefined }>}
 */
export async function runSandbox(code, data) {
  if (!code || typeof code !== 'string') {
    throw new SandboxError('Código custom vazio')
  }

  // congela os dados de entrada para evitar mutação
  const frozenData = Object.freeze({ ...data })

  const context = vm.createContext({
    // dados de entrada (somente leitura)
    data: frozenData,
    input: frozenData,

    // resultado (o sandbox escreve aqui)
    result: undefined,

    // utilitários seguros
    console: {
      log: (...args) => console.log('[sandbox]', ...args),
      warn: (...args) => console.warn('[sandbox]', ...args),
      error: (...args) => console.error('[sandbox]', ...args),
    },

    // math e json
    Math,
    JSON,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,

    // fetch restrito
    fetch: createSafeFetch(),

    // promise para async
    Promise,

    // validação
    ValidationError,
    throwError: (msg) => { throw new ValidationError(msg) },
  })

  try {
    // wrapa em async IIFE para suportar await
    const wrappedCode = `(async () => { ${code} })()`

    const script = new vm.Script(wrappedCode, {
      filename: 'nexus-custom.js',
      timeout: TIMEOUT,
    })

    await script.runInContext(context, { timeout: TIMEOUT })

    return { result: context.result }
  } catch (err) {
    if (err instanceof ValidationError) throw err
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      throw new SandboxError(`Timeout — código excedeu ${TIMEOUT}ms`)
    }
    throw new SandboxError(`Erro no código custom: ${err.message}`)
  }
}
