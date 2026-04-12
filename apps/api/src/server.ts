import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { tenantRoutes } from './modules/tenant/tenant.routes.js'
import { patientRoutes } from './modules/patient/patient.routes.js'
import { patientExternalRoutes } from './modules/patient/patient.external.routes.js'

const isDev = process.env.NODE_ENV === 'development'

const server = Fastify({
  logger: isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
})

async function bootstrap() {
  await server.register(helmet)
  await server.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Rotas
  await server.register(tenantRoutes, { prefix: '/api/v1' })
  await server.register(patientRoutes, { prefix: '/api/v1' })
  await server.register(patientExternalRoutes, { prefix: '/api/v1' })

  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  const rawPort = process.env.PORT ?? '3001'
  const port = parseInt(rawPort, 10)
  if (isNaN(port)) throw new Error(`PORT inválido: "${rawPort}"`)

  const host = process.env.HOST ?? '0.0.0.0'

  await server.listen({ port, host })
  server.log.info(`API rodando em http://${host}:${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
