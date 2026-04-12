import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

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
