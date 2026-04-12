import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { tenantRoutes } from './modules/tenant/tenant.routes.js'
import { patientRoutes } from './modules/patient/patient.routes.js'
import { patientExternalRoutes } from './modules/patient/patient.external.routes.js'
import { conversationRoutes } from './modules/conversation/conversation.routes.js'
import { followupRoutes } from './modules/followup/followup.routes.js'
import { escalationRoutes } from './modules/escalation/escalation.routes.js'
import { settingsRoutes } from './modules/settings/settings.routes.js'
import { whatsappWebhookRoutes } from './modules/whatsapp/whatsapp.webhook.js'
import { startFollowupWorker, startOnboardingWorker } from './modules/followup/followup.worker.js'
import { startFollowupScheduler } from './modules/followup/followup.scheduler.js'

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
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  })

  // Rotas
  await server.register(tenantRoutes, { prefix: '/api/v1' })
  await server.register(patientRoutes, { prefix: '/api/v1' })
  await server.register(patientExternalRoutes, { prefix: '/api/v1' })
  await server.register(conversationRoutes, { prefix: '/api/v1' })
  await server.register(followupRoutes, { prefix: '/api/v1' })
  await server.register(escalationRoutes, { prefix: '/api/v1' })
  await server.register(settingsRoutes, { prefix: '/api/v1' })
  await server.register(whatsappWebhookRoutes, { prefix: '/webhook' })

  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Motor de follow-ups — só inicia se Redis estiver configurado
  if (process.env.REDIS_URL) {
    startFollowupWorker()
    startOnboardingWorker()
    startFollowupScheduler()
    server.log.info('Motor de follow-ups iniciado')
  } else {
    server.log.warn('REDIS_URL não configurado — motor de follow-ups desativado')
  }

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
