/**
 * Nexus Auth System
 * JWT authentication + role-based authorization
 */

import jwt from 'jsonwebtoken'
import { ValidationError } from './validator.js'

const SECRET = process.env.NEXUS_JWT_SECRET ?? 'nexus-dev-secret-change-in-production'
const IS_DEV = process.env.NODE_ENV !== 'production'

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * Gera um JWT token
 * @param {{ id: string|number, role?: string }} payload
 * @returns {string}
 */
export function generateToken(payload) {
  if (!payload.id) throw new ValidationError('Token requer campo "id"')
  return jwt.sign(
    { id: payload.id, role: payload.role ?? 'user' },
    SECRET,
    { expiresIn: '24h' }
  )
}

/**
 * Verifica e decodifica um JWT token
 * @param {string} token
 * @returns {{ id: string|number, role: string }}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthError('Token expirado')
    }
    throw new AuthError('Token inválido')
  }
}

/**
 * Extrai token do header Authorization
 * @param {string|undefined} header
 * @returns {string|null}
 */
export function extractToken(header) {
  if (!header) return null
  if (header.startsWith('Bearer ')) return header.slice(7)
  return header
}

/**
 * Extrai regra de auth de um intent
 * @param {import('./parser.js').Intent} intent
 * @returns {{ type: 'public'|'authenticated'|'role', role?: string }}
 */
export function getIntentAuthRule(intent) {
  const authAction = intent.actions.find(a => a.type === 'authorize')

  if (!authAction) {
    // default: requer autenticação
    return { type: 'authenticated' }
  }

  const raw = authAction.raw

  if (raw === 'public') {
    return { type: 'public' }
  }

  if (raw === 'authenticated') {
    return { type: 'authenticated' }
  }

  // role(admin), role(user), etc
  const roleMatch = raw.match(/^role\((\w+)\)$/)
  if (roleMatch) {
    return { type: 'role', role: roleMatch[1] }
  }

  // fallback: tratar como authenticated
  return { type: 'authenticated' }
}

/**
 * Middleware de autenticação para Fastify
 * Verifica o token e autorização baseado na regra do intent
 * @param {object} req - Fastify request
 * @param {object} authRule - regra de auth do intent
 * @returns {{ id: string|number, role: string } | null} user payload ou null para public
 */
export function enforceAuth(req, authRule) {
  // intents públicos: não requerem token
  if (authRule.type === 'public') {
    const header = req.headers?.authorization
    if (header) {
      // se mandou token, decodifica mas não bloqueia se inválido
      try {
        return verifyToken(extractToken(header))
      } catch {
        return null
      }
    }
    return null
  }

  // todos os outros requerem token válido
  const header = req.headers?.authorization
  const token = extractToken(header)

  if (!token) {
    throw new AuthError('Token de autenticação obrigatório')
  }

  const user = verifyToken(token)

  // verificação de role
  if (authRule.type === 'role') {
    if (user.role !== authRule.role && user.role !== 'admin') {
      throw new AuthError(`Acesso negado — requer role "${authRule.role}"`, 403)
    }
  }

  return user
}

/**
 * Aviso em dev se SECRET padrão está sendo usado
 */
export function warnDefaultSecret() {
  if (IS_DEV && SECRET === 'nexus-dev-secret-change-in-production') {
    console.warn('[nexus:auth] AVISO — usando secret padrão. Defina NEXUS_JWT_SECRET em produção')
  }
  if (!IS_DEV && SECRET === 'nexus-dev-secret-change-in-production') {
    console.error('[nexus:auth] ERRO — NEXUS_JWT_SECRET não configurado em produção!')
    process.exit(1)
  }
}
