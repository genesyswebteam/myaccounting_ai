import { Module } from '@nestjs/common'
import { AuthAccessController } from './auth-access.controller'
import { AuthAccessService } from './auth-access.service'
import { TOKEN_VERIFIER } from './verifiers/token-verifier'
import { StubTokenVerifier } from './verifiers/stub-token-verifier'
import { EntraTokenVerifier } from './verifiers/entra-token-verifier'

@Module({
  controllers: [AuthAccessController],
  providers: [
    AuthAccessService,
    {
      // Titik tukar stub <-> Entra. Cukup ubah AUTH_MODE di .env.
      provide: TOKEN_VERIFIER,
      useClass: process.env.AUTH_MODE === 'entra' ? EntraTokenVerifier : StubTokenVerifier,
    },
  ],
  exports: [AuthAccessService, TOKEN_VERIFIER],
})
export class AuthAccessModule {}
