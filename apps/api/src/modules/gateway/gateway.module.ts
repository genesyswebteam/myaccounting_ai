import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { GatewayController } from './gateway.controller'
import { AuthGuard } from './guards/auth.guard'
import { RequestContextMiddleware } from './middleware/request-context.middleware'
import { AuthAccessModule } from '../auth-access/auth-access.module'

@Module({
  imports: [AuthAccessModule],
  controllers: [GatewayController],
  providers: [
    // Terpasang global: default-nya semua endpoint tertutup.
    // Endpoint yang memang publik harus ditandai @Public() secara eksplisit.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*')
  }
}
