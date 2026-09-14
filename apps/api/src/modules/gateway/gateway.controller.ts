import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@interacc/shared-types'
import { Public } from './decorators/public.decorator'

@Controller()
export class GatewayController {
  @Public()
  @Get('health')
  health(): HealthResponse {
    return { status: 'ok', module: 'gateway', timestamp: new Date().toISOString() }
  }
}
