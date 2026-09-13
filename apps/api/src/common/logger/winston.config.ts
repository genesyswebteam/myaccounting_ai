import * as winston from 'winston'
import { getRequestContext } from '../context/request-context'

/**
 * Menyuntikkan requestId / tenantId / userId ke setiap baris log.
 * Tanpa ini, melacak satu request yang melewati beberapa module jadi mustahil.
 */
const withRequestContext = winston.format((info) => {
  const ctx = getRequestContext()
  if (ctx) {
    info.requestId = ctx.requestId
    if (ctx.tenantId) info.tenantId = ctx.tenantId
    if (ctx.userId) info.userId = ctx.userId
  }
  return info
})

const devFormat = winston.format.printf((info) => {
  const tags = [info.context, info.requestId && `req=${info.requestId}`, info.tenantId && `tenant=${info.tenantId}`]
    .filter(Boolean)
    .join(' ')
  return `${info.timestamp} ${info.level.padEnd(5)} [${tags}] ${info.message}`
})

export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    withRequestContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    // Produksi memakai JSON supaya bisa dicerna log aggregator (mis. App Insights).
    process.env.NODE_ENV === 'production' ? winston.format.json() : devFormat,
  ),
  transports: [new winston.transports.Console()],
}
