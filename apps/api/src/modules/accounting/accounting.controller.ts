import { Controller, ForbiddenException, Get, Param, Post, UnauthorizedException } from '@nestjs/common'
import { subject } from '@casl/ability'
import type { HealthResponse } from '@interacc/shared-types'
import { Public } from '../gateway/decorators/public.decorator'
import { getRequestContext } from '../../common/context/request-context'
import { AbilityFactory } from '../rbac/ability.factory'
import { AccountingService } from './accounting.service'

@Controller()
export class AccountingController {
  constructor(
    private readonly accounting: AccountingService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  @Public()
  @Get('accounting/health')
  health(): HealthResponse {
    return { status: 'ok', module: 'accounting', timestamp: new Date().toISOString() }
  }

  @Get('journals')
  async list() {
    const ctx = getRequestContext()
    if (!ctx?.tenantId) throw new UnauthorizedException()

    const ability = this.abilityFactory.createForContext(ctx)
    if (ability.cannot('read', 'JournalEntry')) {
      throw new ForbiddenException('Tidak punya izin membaca jurnal')
    }

    return this.accounting.findAllForTenant(ctx.tenantId)
  }

  /**
   * Contoh pengecekan izin yang membutuhkan datanya lebih dulu.
   *
   * Aturan "tidak boleh approve jurnal buatan sendiri" hanya bisa dievaluasi
   * setelah `createdBy` diketahui — karena itu jurnalnya diambil dulu (1),
   * baru izinnya diperiksa (2). Urutan ini tidak bisa dibalik.
   */
  @Post('journals/:id/approve')
  async approve(@Param('id') id: string) {
    const ctx = getRequestContext()
    if (!ctx?.tenantId) throw new UnauthorizedException()

    const journal = await this.accounting.findOneForTenant(id, ctx.tenantId) // (1)

    const target = subject('JournalEntry', journal)
    const ability = this.abilityFactory.createForContext(ctx)

    if (ability.cannot('approve', target)) {
      // (2)
      const reason = ability.relevantRuleFor('approve', target)?.reason
      throw new ForbiddenException(reason ?? 'Tidak punya izin approve jurnal ini')
    }

    return this.accounting.approve(id, ctx.tenantId, ctx.userId!)
  }
}
