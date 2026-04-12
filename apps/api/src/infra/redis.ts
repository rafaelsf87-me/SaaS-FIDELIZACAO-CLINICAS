import { Redis } from 'ioredis'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL é obrigatório')
    }
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return redisClient
}

/**
 * Cria uma conexão Redis independente para uso em BullMQ queues/workers.
 * BullMQ recomenda conexões dedicadas (não compartilhadas) por queue/worker.
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) throw new Error('REDIS_URL é obrigatório')
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}
