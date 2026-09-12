import {
  ALERT_THRESHOLDS,
} from './alerts'

import type {
  AlertEvaluation,
} from './alerts'

import {
  countActiveUsers,
  countFailedRequestLogs,
  countRequestLogs,
  countTelemetryEventsByName,
  findRecentRequestLogs,
  findRecentTelemetryEvents,
  getRequestDurationStats,
  insertTelemetryEvent,
  getDeadlockTotal,
  getTransactionRollbackTotal,
  getPerformanceDurationStats,
  getCheckoutStageDurations,
  getCheckoutOutcomeMinuteBuckets,
  getTelemetryEventComparisonWindowCounts,
  getRepeatedLoginFailureAccount,
} from './repository'

import {
  getDbConnectionStats,
  getDbConnectionWaitStats,
  getDbQueryCount,
  getDbQueryDurationStats,
  getLastSlowDbQuery,
  getSlowQueryTotal,
} from '#server/utils/db'

import type {
  InsertTelemetryEventInput,
} from './repository'

import {
  logError,
} from '#server/utils/logger'

import {
  evaluatePerformanceDuration,
  getPerformanceInvestigationSteps,
  getPerformanceThreshold,
  PERFORMANCE_EVENT_NAME,
  PERFORMANCE_OPERATIONS,
  roundDurationMs,
} from './performance'

import type {
  PerformanceOperation,
} from './performance'

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

const sensitiveTelemetryKeyPattern =
  /password|passcode|token|secret|authorization|cookie|session|csrf|api[_-]?key|credential/i

function sanitizeTelemetryValue(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      item =>
        sanitizeTelemetryValue(
          item,
        ),
    )
  }

  if (
    value !== null
    && typeof value === 'object'
  ) {
    const entries =
      Object.entries(
        value as Record<
          string,
          unknown
        >,
      )

    return Object.fromEntries(
      entries.map(
        ([key, nestedValue]) => [
          key,

          sensitiveTelemetryKeyPattern
            .test(key)
            ? '[REDACTED]'
            : sanitizeTelemetryValue(
                nestedValue,
              ),
        ],
      ),
    )
  }

  return value
}

function sanitizeTelemetryMetadata(
  metadata:
    Record<string, unknown>,
) {
  const sanitized =
    sanitizeTelemetryValue(
      metadata,
    )

  if (
    sanitized !== null
    && typeof sanitized === 'object'
    && !Array.isArray(
      sanitized,
    )
  ) {
    return sanitized as
      Record<string, unknown>
  }

  return {}
}

export async function getRecentTelemetryEvents(
  limit = 200,
) {
  const rows =
    await findRecentTelemetryEvents(
      limit,
    )

  return rows.map(
    row => ({
      id:
        Number(
          row.id,
        ),

      eventName:
        row.eventName,

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

      source:
        row.source,

      result:
        row.result,

      metadata:
        sanitizeTelemetryMetadata(
          row.metadata,
        ),

      createdAt:
        new Date(
          row.createdAt,
        ).toISOString(),
    }),
  )
}

export async function getCheckoutFailureRateMinuteBuckets(
  minuteCount: number,
) {
  const buckets =
    await getCheckoutOutcomeMinuteBuckets(
      minuteCount,
    )

  return buckets.map(
    (bucket) => {
      const hasCheckoutActivity =
        bucket.checkoutTotal > 0

      const failureRatePercent =
        hasCheckoutActivity
          ? Number(
              (
                (
                  bucket.failureTotal
                  / bucket.checkoutTotal
                )
                * 100
              ).toFixed(
                2,
              ),
            )
          : null

      const bucketStart =
        bucket.bucketStart
          instanceof Date
          ? bucket.bucketStart.toISOString()
          : String(
              bucket.bucketStart,
            )

      return {
        bucketStart,

        successTotal:
          bucket.successTotal,

        failureTotal:
          bucket.failureTotal,

        checkoutTotal:
          bucket.checkoutTotal,

        hasCheckoutActivity,

        failureRatePercent,
      }
    },
  )
}

export async function getCheckoutFailureRateAlert():
Promise<AlertEvaluation> {
  const threshold =
    ALERT_THRESHOLDS[
      'checkout.failure_rate'
    ]

  const buckets =
    await getCheckoutFailureRateMinuteBuckets(
      threshold.consecutiveMinutes,
    )

  const hasRequiredBuckets =
    buckets.length
    === threshold.consecutiveMinutes

  const allMinutesExceeded =
    hasRequiredBuckets
    && buckets.every(
      bucket =>
        bucket.hasCheckoutActivity
        && bucket.failureRatePercent
          !== null
        && bucket.failureRatePercent
          > threshold.failureRatePercent,
    )

  return {
    id:
      'checkout.failure_rate',

    name:
      'Checkout failure rate',

    status:
      allMinutesExceeded
        ? 'ACTIVE'
        : 'OK',

    severity:
      'CRITICAL',

    condition:
      `Checkout failure rate > ${threshold.failureRatePercent}% for ${threshold.consecutiveMinutes} consecutive completed minutes`,

    evidence: {
      thresholdPercent:
        threshold.failureRatePercent,

      consecutiveMinutes:
        threshold.consecutiveMinutes,

      evaluatedBucketCount:
        buckets.length,

      minuteBuckets:
        buckets,
    },

    investigationSteps: [
      'Inspect checkout.failure telemetry for the affected minutes.',
      'Correlate failed checkouts using orderId and traceId.',
      'Inspect inventory reservation and payment telemetry for the failed orders.',
      'Check whether failures are concentrated in CUSTOMER or POS checkout flows.',
    ],
  }
}

export async function getCriticalDatabaseQueryAlert():
Promise<AlertEvaluation> {
  const threshold =
    ALERT_THRESHOLDS[
      'database.critical_query'
    ]

  const lastSlowQuery =
    getLastSlowDbQuery()

  const nowMs =
    Date.now()

  const occurredAtMs =
    lastSlowQuery
      ? Date.parse(
          lastSlowQuery.occurredAt,
        )
      : null

  const ageMs =
    occurredAtMs === null
      ? null
      : Math.max(
          0,
          nowMs - occurredAtMs,
        )

  const windowMs =
    threshold.windowMinutes
    * 60
    * 1000

  const isRecent =
    lastSlowQuery !== null
    && ageMs !== null
    && ageMs <= windowMs

  return {
    id:
      'database.critical_query',

    name:
      'Critical database query',

    status:
      isRecent
        ? 'ACTIVE'
        : 'OK',

    severity:
      'CRITICAL',

    condition:
      `Database query duration >= ${threshold.durationMs} ms within the last ${threshold.windowMinutes} minutes`,

    evidence: {
      thresholdMs:
        threshold.durationMs,

      windowMinutes:
        threshold.windowMinutes,

      lastSlowQuery,

      ageMs,

      isRecent,
    },

    investigationSteps: [
      'Inspect the slow database query and identify the affected request or operation.',
      'Review the query execution plan and indexes.',
      'Inspect db_connection_wait_ms and connection-pool pressure.',
      'Check whether large data volume, locking, or inefficient filtering caused the delay.',
    ],
  }
}

export async function getPaymentTimeoutIncreaseAlert():
Promise<AlertEvaluation> {
  const threshold =
    ALERT_THRESHOLDS[
      'payment.timeout_increase'
    ]

  const counts =
    await getTelemetryEventComparisonWindowCounts(
      'payment.timeout',
      threshold.windowMinutes,
    )

  const meetsMinimumCount =
    counts.currentTotal
    >= threshold.minimumCurrentCount

  const requiredIncrease =
    counts.previousTotal
    * threshold.increaseMultiplier

  const meetsIncreaseRule =
    counts.currentTotal
    >= requiredIncrease

  const isUnusualIncrease =
    meetsMinimumCount
    && meetsIncreaseRule

  return {
    id:
      'payment.timeout_increase',

    name:
      'Payment timeout increase',

    status:
      isUnusualIncrease
        ? 'ACTIVE'
        : 'OK',

    severity:
      'CRITICAL',

    condition:
      `At least ${threshold.minimumCurrentCount} payment timeouts in the current ${threshold.windowMinutes}-minute window and at least ${threshold.increaseMultiplier}x the previous window`,

    evidence: {
      windowMinutes:
        threshold.windowMinutes,

      minimumCurrentCount:
        threshold.minimumCurrentCount,

      increaseMultiplier:
        threshold.increaseMultiplier,

      previousTimeoutTotal:
        counts.previousTotal,

      currentTimeoutTotal:
        counts.currentTotal,

      requiredIncrease,

      meetsMinimumCount,

      meetsIncreaseRule,
    },

    investigationSteps: [
      'Inspect payment.timeout telemetry for affected orders.',
      'Correlate timeout events using orderId and traceId.',
      'Check the payment provider or simulated gateway for increased latency or availability problems.',
      'Verify that timed-out payments remain UNKNOWN and are not charged again blindly.',
    ],
  }
}

export async function getNegativeStockAttemptAlert():
Promise<AlertEvaluation> {
  const threshold =
    ALERT_THRESHOLDS[
      'inventory.negative_stock_attempt'
    ]

  const attemptCount =
    await countTelemetryEventsByName(
      'negative_stock_attempt',
    )

  const hasNegativeStockAttempt =
    attemptCount
    >= threshold.minimumCount

  return {
    id:
      'inventory.negative_stock_attempt',

    name:
      'Negative stock attempt',

    status:
      hasNegativeStockAttempt
        ? 'ACTIVE'
        : 'OK',

    severity:
      'CRITICAL',

    condition:
      `negative_stock_attempt_total >= ${threshold.minimumCount}`,

    evidence: {
      attemptCount,

      minimumCount:
        threshold.minimumCount,

      hasNegativeStockAttempt,
    },

    investigationSteps: [
      'Inspect negative_stock_attempt telemetry for the affected branch and product.',
      'Correlate the attempt using traceId and userId.',
      'Review the requested stock adjustment and its delta value.',
      'Verify that the stock invariant prevented inventory from becoming negative.',
    ],
  }
}

export async function getRepeatedLoginFailureAlert():
Promise<AlertEvaluation> {
  const threshold =
    ALERT_THRESHOLDS[
      'security.repeated_login_failure'
    ]

  const repeatedFailure =
    await getRepeatedLoginFailureAccount(
      threshold.windowMinutes,
    )

  const hasRepeatedFailures =
    repeatedFailure.failureCount
    >= threshold.failureCount

  return {
    id:
      'security.repeated_login_failure',

    name:
      'Repeated authentication failures',

    status:
      hasRepeatedFailures
        ? 'ACTIVE'
        : 'OK',

    severity:
      'CRITICAL',

    condition:
      `At least ${threshold.failureCount} failed login attempts from the same account within ${threshold.windowMinutes} minutes`,

    evidence: {
      windowMinutes:
        threshold.windowMinutes,

      failureThreshold:
        threshold.failureCount,

      accountKey:
        repeatedFailure.accountKey,

      failureCount:
        repeatedFailure.failureCount,

      hasRepeatedFailures,
    },

    investigationSteps: [
      'Inspect security.login.failure telemetry for the affected accountKey.',
      'Correlate the failed attempts using requestId and traceId.',
      'Check whether the failures are caused by a user mistake, stale credentials, or suspicious repeated access attempts.',
      'Inspect related rate-limit and authorization-denied telemetry if the activity continues.',
    ],
  }
}

export async function getAlertTelemetry() {
  const alerts =
    await Promise.all([
      getCheckoutFailureRateAlert(),
      getCriticalDatabaseQueryAlert(),
      getPaymentTimeoutIncreaseAlert(),
      getNegativeStockAttemptAlert(),
      getRepeatedLoginFailureAlert(),
    ])

  const activeAlerts =
    alerts.filter(
      alert =>
        alert.status === 'ACTIVE',
    )

  return {
    status:
      activeAlerts.length > 0
        ? 'ALERT'
        : 'OK',

    alertCount:
      alerts.length,

    activeAlertCount:
      activeAlerts.length,

    alerts,
  }
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

export type CheckoutPerformanceStage =
  | 'order.create'
  | 'inventory.reserve'
  | 'payment.authorize'
  | 'order.complete'

export type CheckoutPerformanceSource =
  | 'CUSTOMER'
  | 'POS'

export interface RecordCheckoutStageInput {
  stage:
    CheckoutPerformanceStage

  durationMs:
    number

  orderId:
    number

  source:
    CheckoutPerformanceSource

  requestId?:
    string | null

  traceId?:
    string | null

  userId?:
    number | null

  branchId?:
    number | null

  orderType?:
  | 'DINE_IN'
  | 'TAKEOUT'
  | 'PICKUP'
  | 'DELIVERY'
  | null

  result?:
    | 'success'
    | 'failed'

  metadata?: Record<
    string,
    unknown
  >
}

export async function recordCheckoutStage(
  input: RecordCheckoutStageInput,
) {
  const durationMs =
    roundDurationMs(
      input.durationMs,
    )

  return recordTelemetryEvent({
    eventName:
      'checkout.stage',

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
      input.orderId,

    source:
      input.source,

    result:
      input.result
      ?? 'success',

    metadata: {
      ...(
        input.metadata
        ?? {}
      ),

      stage:
        input.stage,

      durationMs,

      orderType:
        input.orderType
        ?? null,
    },
  })
}

export interface RecordPerformanceSampleInput {
  operation:
    PerformanceOperation

  durationMs:
    number

  requestId?:
    string | null

  traceId?:
    string | null

  userId?:
    number | null

  branchId?:
    number | null

  orderId?:
    number | null

  source?:
    string | null

  result?:
    string | null

  orderType?:
    | 'DINE_IN'
    | 'TAKEOUT'
    | null

  stage?:
    string | null

  metadata?: Record<
    string,
    unknown
  >
}

export async function getPerformanceOperationStats(
  operation: PerformanceOperation,
) {
  const stats =
    await getPerformanceDurationStats(
      operation,
    )

  const threshold =
    getPerformanceThreshold(
      operation,
    )

  /*
   * Overall operation health is
   * determined using p95 because
   * Task 10 should not be judged
   * only by the average response.
   */
  const status =
    stats.sampleCount > 0
      ? evaluatePerformanceDuration(
          operation,
          stats.p95Ms,
        )
      : 'HEALTHY'

  return {
    operation,

    sampleCount:
      stats.sampleCount,

    durationMs: {
      average:
        roundDurationMs(
          stats.averageMs,
        ),

      min:
        roundDurationMs(
          stats.minMs,
        ),

      max:
        roundDurationMs(
          stats.maxMs,
        ),

      p95:
        roundDurationMs(
          stats.p95Ms,
        ),
    },

    thresholds: {
      targetMs:
        threshold.targetMs,

      warningMs:
        threshold.warningMs,

      criticalMs:
        threshold.criticalMs,
    },

    investigationSteps:
      getPerformanceInvestigationSteps(
      operation,
  ),

    status,
  }
}

export async function getPerformanceTelemetry() {
  const entries =
    await Promise.all(
      PERFORMANCE_OPERATIONS.map(
        async operation => {
          const stats =
            await getPerformanceOperationStats(
              operation,
            )

          return [
            operation,
            stats,
          ] as const
        },
      ),
    )

  return Object.fromEntries(
    entries,
  )
}

export async function recordPerformanceSample(
  input: RecordPerformanceSampleInput,
) {
  const durationMs =
    roundDurationMs(
      input.durationMs,
    )

  const threshold =
    getPerformanceThreshold(
      input.operation,
    )

  return recordTelemetryEvent({
    eventName:
      PERFORMANCE_EVENT_NAME,

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

    source:
      input.source
      ?? null,

    result:
      input.result
      ?? null,

    metadata: {
      ...(
        input.metadata
        ?? {}
      ),

      operation:
        input.operation,

      durationMs,

      orderType:
        input.orderType
        ?? null,

      stage:
        input.stage
        ?? null,

      targetMs:
        threshold.targetMs,

      warningMs:
        threshold.warningMs,

      criticalMs:
        threshold.criticalMs,

      performanceStatus:
        evaluatePerformanceDuration(
          input.operation,
          durationMs,
        ),
    },
  })
}

export interface RecordCheckoutWorkflowPerformanceInput {
  orderId:
    number

  source:
    CheckoutPerformanceSource

  requestId?:
    string | null

  traceId?:
    string | null

  userId?:
    number | null

  branchId?:
    number | null

  orderType?:
    | 'DINE_IN'
    | 'TAKEOUT'
    | null
}

export async function recordCheckoutWorkflowPerformance(
  input: RecordCheckoutWorkflowPerformanceInput,
) {
  /*
   * Read the latest successful duration
   * for each Checkout stage belonging
   * to this order.
   */
  const stages =
    await getCheckoutStageDurations(
      input.orderId,
      input.source,
    )

  const {
    orderCreateMs,
    inventoryReserveMs,
    paymentAuthorizeMs,
    orderCompleteMs,
  } = stages

  /*
   * A complete Checkout performance
   * sample is valid only when all four
   * stages are available.
   *
   * If even one stage is missing,
   * do not create an incomplete
   * checkout.workflow sample.
   */
  if (
    orderCreateMs === null
    || inventoryReserveMs === null
    || paymentAuthorizeMs === null
    || orderCompleteMs === null
  ) {
    return false
  }

  /*
   * Human waiting time is not included.
   *
   * We add only the server-side work
   * performed by the four logical
   * Checkout stages.
   */
  const durationMs =
    roundDurationMs(
      orderCreateMs
      + inventoryReserveMs
      + paymentAuthorizeMs
      + orderCompleteMs,
    )

  /*
   * Store ONE final Task 10 Checkout
   * performance sample.
   */
  return recordPerformanceSample({
    operation:
      'checkout.workflow',

    durationMs,

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
      input.orderId,

    source:
      input.source,

    result:
      'success',

    orderType:
      input.orderType
      ?? null,

    metadata: {
      stages: {
        orderCreateMs:
          roundDurationMs(
            orderCreateMs,
          ),

        inventoryReserveMs:
          roundDurationMs(
            inventoryReserveMs,
          ),

        paymentAuthorizeMs:
          roundDurationMs(
            paymentAuthorizeMs,
          ),

        orderCompleteMs:
          roundDurationMs(
            orderCompleteMs,
          ),
      },
    },
  })
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