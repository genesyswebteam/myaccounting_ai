import { Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { requestContextStorage } from '../../../common/context/request-context'

/**
 * Membuka AsyncLocalStorage untuk setiap request dan menanam requestId.
 * Harus jadi yang pertama jalan — guard dan logger bergantung pada store ini.
 *
 * Access log sengaja ditulis di sini, bukan di interceptor: interceptor baru
 * jalan SETELAH guard, sehingga request yang ditolak 401 tidak akan tercatat.
 * Padahal percobaan autentikasi yang gagal justru yang paling perlu terlihat.
 * `res.on('finish')` menangkap semuanya, apa pun yang mengakhiri request.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id']
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()

    // Dikembalikan ke client supaya satu request bisa dilacak dari ujung ke ujung.
    res.setHeader('x-request-id', requestId)

    const started = Date.now()

    requestContextStorage.run({ requestId, roles: [] }, () => {
      // Callback ini masih berada di dalam store yang sama, sehingga winston
      // tetap bisa membaca tenantId yang baru diisi guard setelahnya.
      res.on('finish', () => {
        this.logger.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`,
        )
      })
      next()
    })
  }
}
