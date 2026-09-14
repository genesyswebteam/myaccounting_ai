import { Module } from '@nestjs/common'
import { AbilityFactory } from './ability.factory'
import { RbacController } from './rbac.controller'

@Module({
  controllers: [RbacController],
  providers: [AbilityFactory],
  exports: [AbilityFactory],
})
export class RbacModule {}
