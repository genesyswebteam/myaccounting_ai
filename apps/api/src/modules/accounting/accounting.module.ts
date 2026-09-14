import { Module } from '@nestjs/common'
import { AccountingController } from './accounting.controller'
import { AccountingService } from './accounting.service'
import { RbacModule } from '../rbac/rbac.module'

@Module({
  imports: [RbacModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
