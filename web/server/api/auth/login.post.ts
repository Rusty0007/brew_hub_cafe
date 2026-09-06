import {
  createHash,
} from 'node:crypto'

import { z } from 'zod'
import { authenticateUser } from '#server/domains/authentication/service'
import { createAuthSession } from '#server/domains/authentication/session'

import {
  recordPerformanceSample,
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

const bodySchema = z.object({
    username: z
    .string()
    .trim()
    .min(3)
    .max(80),

    password: z
    .string()
    .min(8)
    .max(128)
})

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid login data',
            data: parsed.error.flatten(),
        })
    }

    const loginTimer =
      startPerformanceTimer()

    let performanceSampleRecorded =
      false

    let performanceUserId:
      number | null =
        null

    try {
  const user =
    await authenticateUser(
      parsed.data.username,
      parsed.data.password,
    )

  /*
   * Authentication finished but
   * credentials were rejected.
   */
  if (!user) {

    const accountKey =
      createHash(
        'sha256',
      )
        .update(
          parsed.data.username
            .trim()
            .toLowerCase(),
        )
        .digest(
          'hex',
        )

    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    /*
     * Capture the duration BEFORE
     * writing telemetry.
     */
    const durationMs =
      loginTimer.elapsedMs()

    await recordPerformanceSample({
      operation:
        'auth.login',

      durationMs,

      requestId:
        requestContext.requestId,

      traceId:
        requestContext.traceId,

      userId:
        null,

      source:
        'AUTH',

      result:
        'failed',

      metadata: {
        reason:
          'invalid_credentials',
      },
    })

    performanceSampleRecorded =
      true

    logWarn(
      'security.login.failure',
      {
        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        accountKey,

        durationMs,

        source:
          'AUTH',

        result:
          'failed',

        reason:
          'invalid_credentials',
      },
    )

    /*
     * Existing Task 9 security
     * telemetry remains unchanged.
     */
    await recordTelemetryEvent({
      eventName:
        'security.login.failure',

      requestId:
        requestContext.requestId,

      traceId:
        requestContext.traceId,

      result:
        'failed',

      metadata: {
        accountKey,

      reason:
        'invalid_credentials'
      }
    })

    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid username or password',
    })
  }

  performanceUserId =
    user.id

  /*
   * Session creation belongs inside
   * the Login performance boundary.
   */
  await createAuthSession(
    event,
    user.id,
  )

  const requestContext =
    getBrewHubRequestContext(
      event,
    )

  /*
   * Successful Login ends when the
   * authenticated session is ready.
   */
  const durationMs =
    loginTimer.elapsedMs()

  await recordPerformanceSample({
    operation:
      'auth.login',

    durationMs,

    requestId:
      requestContext.requestId,

    traceId:
      requestContext.traceId,

    userId:
      user.id,

    source:
      'AUTH',

    result:
      'success',
  })

  performanceSampleRecorded =
    true

  logInfo(
    'security.login.success',
    {
      requestId:
        requestContext.requestId,

      traceId:
        requestContext.traceId,

      userId:
        user.id,

      durationMs,

      source:
        'AUTH',

      result:
        'success',
    },
  )

  /*
   * Preserve existing Task 9
   * security telemetry.
   */
  await recordTelemetryEvent({
    eventName:
      'security.login.success',

    requestId:
      requestContext.requestId,

    traceId:
      requestContext.traceId,

    userId:
      user.id,

    result:
      'success',
  })

  return {
    message:
      'Login successful',

    user,
  }
}
catch (error) {
  /*
   * Invalid credentials were already
   * recorded above. This branch handles
   * unexpected authentication/session
   * failures without producing a
   * duplicate performance sample.
   */
  if (!performanceSampleRecorded) {
    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    const durationMs =
      loginTimer.elapsedMs()

    await recordPerformanceSample({
      operation:
        'auth.login',

      durationMs,

      requestId:
        requestContext.requestId,

      traceId:
        requestContext.traceId,

      userId:
        performanceUserId,

      source:
        'AUTH',

      result:
        'failed',

      metadata: {
        reason:
          'unexpected_error',
      },
    })
  }

  throw error
}

})
