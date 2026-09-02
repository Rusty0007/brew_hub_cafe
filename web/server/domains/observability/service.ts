

import {
  countActiveUsers,
  countFailedRequestLogs,
  countRequestLogs,
  countTelemetryEventsByName,
  findRecentRequestLogs,
  getRequestDurationStats,
  insertTelemetryEvent,
  getDeadlockTotal,
  getTransactionRollbackTotal,
} from './repository'

import {
  getDbConnectionStats,
  getDbConnectionWaitStats,
  getDbQueryCount,
  getDbQueryDurationStats,
  getSlowQueryTotal,
} from '#server/utils/db'

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

export async function getDatabaseTelemetry() {
  const dbQueryCount =
    getDbQueryCount()

  const dbQueryDurationStats =
    getDbQueryDurationStats()

  const dbConnectionStats =
    getDbConnectionStats()

  const dbConnectionWaitStats =
    getDbConnectionWaitStats()

  const slowQueryTotal =
    getSlowQueryTotal()

  const transactionRollbackTotal =
    await getTransactionRollbackTotal()

  const deadlockTotal =
    await getDeadlockTotal()

  return {
    db_query_count:
      dbQueryCount,

    db_query_duration_ms: {
      average:
        Number(
          dbQueryDurationStats.averageMs.toFixed(
            2,
          ),
        ),

      min:
        dbQueryDurationStats.minMs,

      max:
        dbQueryDurationStats.maxMs,
    },

    db_connection_count: {
      total:
        dbConnectionStats.total,

      idle:
        dbConnectionStats.idle,

      waiting:
        dbConnectionStats.waiting,
    },

    db_connection_wait_ms: {
      average:
        Number(
          dbConnectionWaitStats.averageMs.toFixed(
            2,
          ),
        ),

      min:
        dbConnectionWaitStats.minMs,

      max:
        dbConnectionWaitStats.maxMs,
    },

    slow_query_total:
      slowQueryTotal,

    transaction_rollback_total:
      transactionRollbackTotal,

    deadlock_total:
      deadlockTotal,
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

export async function getSecurityTelemetry() {
  const loginSuccessTotal =
    await countTelemetryEventsByName(
      'security.login.success',
    )

  const loginFailureTotal =
    await countTelemetryEventsByName(
      'security.login.failure',
    )

  const authorizationDeniedTotal =
    await countTelemetryEventsByName(
      'security.authorization.denied',
    )

  const rateLimitTriggeredTotal =
    await countTelemetryEventsByName(
      'security.rate_limit.triggered',
    )

  const csrfFailureTotal =
    await countTelemetryEventsByName(
      'security.csrf.failure',
    )

  return {
    login_success_total:
      loginSuccessTotal,

    login_failure_total:
      loginFailureTotal,

    authorization_denied_total:
      authorizationDeniedTotal,

    rate_limit_triggered_total:
      rateLimitTriggeredTotal,

    csrf_failure_total:
      csrfFailureTotal,
  }
}