import {
  countActiveUsers,
  countFailedRequestLogs,
  countRequestLogs,
  countTelemetryEventsByName,
  findRecentRequestLogs,
  getRequestDurationStats,
  insertTelemetryEvent,
} from './repository'

import type {
  InsertTelemetryEventInput,
} from './repository'

import {
  logError,
} from '#server/utils/logger'

export async function getRecentRequestLogs(
  limit = 100,
) {
  const rows =
    await findRecentRequestLogs(
      limit,
    )

  return rows.map(
    row => ({
      id:
        Number(
          row.id,
        ),

      requestId:
        row.requestId,

      traceId:
        row.traceId,

      userId:
        row.userId === null
          ? null
          : Number(
              row.userId,
            ),

      branchId:
        row.branchId === null
          ? null
          : Number(
              row.branchId,
            ),

      orderId:
        row.orderId === null
          ? null
          : Number(
              row.orderId,
            ),

      method:
        row.method,

      path:
        row.path,

      statusCode:
        Number(
          row.statusCode,
        ),

      durationMs:
        Number(
          row.durationMs,
        ),

      startedAt:
        new Date(
          row.startedAt,
        ).toISOString(),

      completedAt:
        new Date(
          row.completedAt,
        ).toISOString(),
    }),
  )
}

export async function getApplicationTelemetry() {
  const requestsTotal =
    await countRequestLogs()

  const requestsFailedTotal =
    await countFailedRequestLogs()

  const requestDurationStats =
    await getRequestDurationStats()

  const activeUsers =
    await countActiveUsers()

  const checkoutTotal =
    await countTelemetryEventsByName(
      'checkout.start',
    )

  const checkoutSuccessTotal =
  await countTelemetryEventsByName(
    'checkout.success',
  )

  const checkoutFailureTotal =
  await countTelemetryEventsByName(
    'checkout.failure',
  )

  return {
    requests_total:
      requestsTotal,

    requests_failed_total:
      requestsFailedTotal,

    request_duration_ms: {
      average:
        Number(
          requestDurationStats.averageMs.toFixed(
            2,
          ),
        ),

      min:
        requestDurationStats.minMs,

      max:
        requestDurationStats.maxMs,

      p95:
        Number(
          requestDurationStats.p95Ms.toFixed(
            2,
          ),
        ),
    },

      active_users:
        activeUsers,

      checkout_total:
        checkoutTotal,

      checkout_success_total:
        checkoutSuccessTotal,

      checkout_failure_total:
       checkoutFailureTotal,
  }
}

export async function recordTelemetryEvent(
  input: InsertTelemetryEventInput,
) {
  try {
    await insertTelemetryEvent(
      input,
    )

    return true
  }
  catch (error) {
    logError(
      'observability.telemetry_event.persist_failed',
      {
        requestId:
          input.requestId
          ?? null,

        traceId:
          input.traceId
          ?? null,

        userId:
          input.userId
          ?? null,

        branchId:
          input.branchId
          ?? null,

        orderId:
          input.orderId
          ?? null,

        telemetryEvent:
          input.eventName,

        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
    )

    return false
  }
}