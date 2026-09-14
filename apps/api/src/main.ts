import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  // Pengaman: stub verifier menerima token palsu, jadi haram ada di produksi.
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_MODE !== 'entra') {
    throw new Error('AUTH_MODE harus "entra" di produksi — stub verifier menerima token palsu.')
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })

  // Sengaja API_PORT, bukan PORT: di monorepo, PORT dibaca juga oleh Next.js
  // sehingga keduanya berebut port yang sama saat `pnpm dev`.
  const port = Number(process.env.API_PORT ?? 4000)
  await app.listen(port)

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER)
  logger.log(`API jalan di http://localhost:${port} (AUTH_MODE=${process.env.AUTH_MODE ?? 'stub'})`, 'Bootstrap')
}

void bootstrap()
