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
