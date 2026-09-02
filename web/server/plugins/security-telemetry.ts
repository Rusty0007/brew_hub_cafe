import type {
  H3Event,
} from 'h3'

import {
  getMethod,
  getRequestURL,
} from 'h3'

import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

function getOptionalRequestContext(
  event: H3Event,
) {
  try {
    return getBrewHubRequestContext(
      event,
    )
  }
  catch {
    return null
  }
}

function getErrorStatusCode(
  error: unknown,
) {
  if (
    !error
    || typeof error !== 'object'
  ) {
    return null
  }

  if (
    'statusCode' in error
    && typeof error.statusCode
      === 'number'
  ) {
    return error.statusCode
  }

  if (
    'status' in error
    && typeof error.status
      === 'number'
  ) {
    return error.status
  }

  return null
}

export default defineNitroPlugin(
  (nitroApp) => {
    nitroApp.hooks.hook(
      'error',
      async (
        error,
        {
          event,
        },
      ) => {
        if (!event) {
          return
        }

        const statusCode =
          getErrorStatusCode(
            error,
          )

        const requestContext =
  getOptionalRequestContext(
    event,
  )

const requestPath =
  getRequestURL(
    event,
  ).pathname

if (statusCode === 429) {
  await recordTelemetryEvent({
    eventName:
      'security.rate_limit.triggered',

    requestId:
      requestContext?.requestId
      ?? null,

    traceId:
      requestContext?.traceId
      ?? null,

    userId:
      requestContext?.userId
      ?? null,

    result:
      'blocked',

    metadata: {
      method:
        getMethod(
          event,
        ),

      path:
        requestPath,

      statusCode,
    },
  })

  return
}

if (
  statusCode === 403
  && requestPath
    === '/api/auth/login'
) {
  await recordTelemetryEvent({
    eventName:
      'security.csrf.failure',

    requestId:
      requestContext?.requestId
      ?? null,

    traceId:
      requestContext?.traceId
      ?? null,

    userId:
      requestContext?.userId
      ?? null,

    result:
      'blocked',

    metadata: {
      method:
        getMethod(
          event,
        ),

      path:
        requestPath,

      statusCode,
    },
  })
}
      },
    )
  },
)