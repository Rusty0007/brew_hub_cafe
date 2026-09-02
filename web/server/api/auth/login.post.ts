import { z } from 'zod'
import { authenticateUser } from '#server/domains/authentication/service'
import { createAuthSession } from '#server/domains/authentication/session'

import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

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

    const user = await authenticateUser(
        parsed.data.username,
        parsed.data.password
    )

    if (!user) {
      const requestContext =
        getBrewHubRequestContext(
          event,
        )
    
      await recordTelemetryEvent({
        eventName:
          'security.login.failure',
    
        requestId:
          requestContext.requestId,
    
        traceId:
          requestContext.traceId,
    
        result:
          'failed',
      })
    
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid credentials',
      })
    }

    await createAuthSession(event, user.id)

    const requestContext =
      getBrewHubRequestContext(
        event,
      )
    
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
        message: 'Login successful', user,
    }
})