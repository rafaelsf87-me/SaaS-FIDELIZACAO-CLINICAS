import { Queue } from 'bullmq'
import { createRedisConnection } from '../../infra/redis.js'

// -----------------------------------------------------------------------
// Job payload types
// -----------------------------------------------------------------------

export interface FollowupJobData {
  agendaId: string
  tenantId: string
  patientId: string
  patientPhone: string
  patientFirstName: string
  messageText: string
  source: string
}

export interface OnboardingJobData {
  tenantId: string
  patientId: string
  patientPhone: string
  patientFirstName: string
  step: 'welcome' | 'summary'
  summary?: string | null
}

// -----------------------------------------------------------------------
// Queue singletons
// -----------------------------------------------------------------------

let _followupQueue: Queue<FollowupJobData> | null = null
let _onboardingQueue: Queue<OnboardingJobData> | null = null

export function getFollowupQueue(): Queue<FollowupJobData> {
  if (!_followupQueue) {
    _followupQueue = new Queue<FollowupJobData>('followup-processor', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      },
    })
  }
  return _followupQueue
}

export function getOnboardingQueue(): Queue<OnboardingJobData> {
  if (!_onboardingQueue) {
    _onboardingQueue = new Queue<OnboardingJobData>('onboarding', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 200,
      },
    })
  }
  return _onboardingQueue
}
