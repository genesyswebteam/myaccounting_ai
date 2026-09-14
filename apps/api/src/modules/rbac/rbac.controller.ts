import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@interacc/shared-types'
import { Public } from '../gateway/decorators/public.decorator'
import { AbilityFactory } from './ability.factory'
import { getRequestContext } from '../../common/context/request-context'

@Controller('rbac')
export class RbacController {
  constructor(private readonly abilityFactory: AbilityFactory) {}

  @Public()
  @Get('health')
  health(): HealthResponse {
    return { status: 'ok', module: 'rbac', timestamp: new Date().toISOString() }
  }

  /**
   * Menampilkan aturan CASL yang berlaku untuk user saat ini.
   * Nantinya endpoint inilah yang dikonsumsi frontend agar tombol yang tidak
   * diizinkan otomatis tersembunyi — memakai definisi rule yang sama persis.
   */
  @Get('abilities')
  abilities() {
    const ctx = getRequestContext()
    if (!ctx) return { rules: [] }
    return { roles: ctx.roles, rules: this.abilityFactory.createForContext(ctx).rules }
  }
}
