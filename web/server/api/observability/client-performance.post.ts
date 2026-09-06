import { z } from 'zod'

import {
  recordPerformanceSample,
} from '#server/domains/observability/service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

const bodySchema =
  z.object({
    operation:
      z.literal(
        'ordering.add_item',
      ),

    durationMs:
      z.number()
        .finite()
        .min(0)
        .max(10000),

    source:
      z.enum([
        'CUSTOMER',
        'POS',
      ]),

    result:
      z.enum([
        'success',
        'failed',
      ]),

    metadata:
      z.record(
        z.string(),
        z.unknown(),
      )
        .optional(),
  })

export default defineEventHandler(
  async (event) => {
    const body =
      await readBody(event)

    const parsed =
      bodySchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid client performance sample',

        data:
          parsed.error.flatten(),
      })
    }

    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    const recorded =
      await recordPerformanceSample({
        operation:
          parsed.data.operation,

        durationMs:
          parsed.data.durationMs,

        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        userId:
          requestContext.userId,

        branchId:
          requestContext.branchId,

        source:
          parsed.data.source,

        result:
          parsed.data.result,

        metadata:
          parsed.data.metadata,
      })

    if (!recorded) {
      throw createError({
        statusCode: 503,
        statusMessage:
          'Unable to persist client performance sample',
      })
    }

    return {
      recorded: true,
    }
  },
)
