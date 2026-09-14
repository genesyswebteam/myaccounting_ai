import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@interacc/shared-types'
import { Public } from '../gateway/decorators/public.decorator'
import { getRequestContext } from '../../common/context/request-context'

@Controller('auth')
export class AuthAccessController {
  @Public()
  @Get('health')
  health(): HealthResponse {
    return { status: 'ok', module: 'auth-access', timestamp: new Date().toISOString() }
  }

  /** Menampilkan identitas yang berhasil di-resolve dari token — berguna untuk debugging. */
  @Get('me')
  me() {
    const ctx = getRequestContext()
    return { userId: ctx?.userId, tenantId: ctx?.tenantId, roles: ctx?.roles ?? [] }
  }
}
