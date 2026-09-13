import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { TOKEN_VERIFIER, type TokenVerifier } from '../../auth-access/verifiers/token-verifier'
import { AuthAccessService } from '../../auth-access/auth-access.service'
import { setIdentity } from '../../../common/context/request-context'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * Pintu masuk tunggal. Urutan kerjanya:
 *   1. Ambil bearer token
 *   2. Verifikasi (stub atau Entra — guard ini tidak peduli yang mana)
 *   3. Petakan identitas Entra ke user + tenant lokal
 *   4. Tanam ke request context supaya dibaca CASL, query, dan logger
 *
 * Sampai di sini urusannya masih AUTHENTICATION. Keputusan boleh/tidak
 * ada di CASL, satu lapis setelah ini.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly authAccess: AuthAccessService,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<Request>()
    const header = req.headers.authorization

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Header Authorization: Bearer <token> tidak ditemukan')
    }

    const verified = await this.verifier.verify(header.slice('Bearer '.length))
    const local = await this.authAccess.resolveLocalUser(verified)

    setIdentity({ userId: local.userId, tenantId: local.tenantId, roles: verified.roles })
    this.logger.debug(`Terautentikasi sebagai ${local.userId}`)

    return true
  }
}
