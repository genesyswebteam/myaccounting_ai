import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WinstonModule } from 'nest-winston'
import { winstonConfig } from './common/logger/winston.config'
import { GatewayModule } from './modules/gateway/gateway.module'
import { AuthAccessModule } from './modules/auth-access/auth-access.module'
import { RbacModule } from './modules/rbac/rbac.module'
import { AccountingModule } from './modules/accounting/accounting.module'

/**
 * Modular monolith: satu proses, empat module dengan batas yang tegas.
 * Batas ini sengaja dijaga rapi supaya kalau nanti dipecah jadi microservices
 * ("Future Option" di diagram arsitektur), tiap module bisa diangkat keluar
 * tanpa membongkar yang lain.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    WinstonModule.forRoot(winstonConfig),
    GatewayModule,
    AuthAccessModule,
    RbacModule,
    AccountingModule,
  ],
})
export class AppModule {}
