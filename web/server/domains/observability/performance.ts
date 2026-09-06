import {
  performance,
} from 'node:perf_hooks'

export const PERFORMANCE_EVENT_NAME =
  'performance.sample'

export const PERFORMANCE_OPERATIONS = [
  'auth.login',
  'catalog.product_list',
  'catalog.product_search',
  'ordering.add_item',
  'inventory.reserve',
  'checkout.workflow',
  'report.standard',
] as const

export type PerformanceOperation =
  typeof PERFORMANCE_OPERATIONS[number]

export type PerformanceStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'CRITICAL'

export interface PerformanceThreshold {
  /*
   * TESDA maximum acceptable
   * response time for the operation.
   */
  targetMs: number

  /*
   * BrewHub early-warning threshold.
   *
   * Currently 80% of the TESDA
   * maximum.
   */
  warningMs: number

  /*
   * Reaching or exceeding this value
   * means the TESDA target has been
   * breached.
   */
  criticalMs: number
}

export interface DurationStatistics {
  sampleCount: number

  averageMs: number
  minMs: number
  maxMs: number
  p95Ms: number
}

const PERFORMANCE_THRESHOLDS:
Record<
  PerformanceOperation,
  PerformanceThreshold
> = {
  'auth.login': {
    targetMs: 800,
    warningMs: 640,
    criticalMs: 800,
  },

  'catalog.product_list': {
    targetMs: 500,
    warningMs: 400,
    criticalMs: 500,
  },

  'catalog.product_search': {
    targetMs: 700,
    warningMs: 560,
    criticalMs: 700,
  },

  'ordering.add_item': {
    targetMs: 300,
    warningMs: 240,
    criticalMs: 300,
  },

  'inventory.reserve': {
    targetMs: 500,
    warningMs: 400,
    criticalMs: 500,
  },

  'checkout.workflow': {
    targetMs: 2000,
    warningMs: 1600,
    criticalMs: 2000,
  },

  'report.standard': {
    targetMs: 5000,
    warningMs: 4000,
    criticalMs: 5000,
  },
}

const PERFORMANCE_INVESTIGATION_STEPS:
Record<
  PerformanceOperation,
  readonly string[]
> = {
  'auth.login': [
    'Compare auth.login p95 with request_duration_ms for POST /api/auth/login.',
    'Inspect login_failure_total and authentication logs for unusual retries or failures.',
    'Inspect db_query_duration_ms and db_connection_wait_ms for user and session lookups.',
    'If database timing is normal, inspect password verification and session creation.',
  ],

  'catalog.product_list': [
    'Compare catalog.product_list p95 with GET /api/catalog/products request duration.',
    'Inspect db_query_duration_ms, db_query_count, and slow_query_total for catalog queries.',
    'Check product-list and COUNT query execution plans, indexes, pagination, and returned row count.',
    'Check whether product or payload growth is increasing serialization and response time.',
  ],

  'catalog.product_search': [
    'Compare catalog.product_search p95 with GET /api/catalog/products search requests.',
    'Inspect db_query_duration_ms and slow_query_total for search queries.',
    'Review search query execution plans and indexes used by SKU or product-name filtering.',
    'Check whether broad search terms or increased product volume are causing excessive scanning.',
  ],

  'ordering.add_item': [
    'Compare ordering.add_item samples by CUSTOMER and POS source.',
    'Inspect client-side mutation and rendering work when duration increases.',
    'For CUSTOMER, inspect localStorage persistence and cart-state updates.',
    'For POS, inspect reactive posLines updates and UI rendering before investigating network telemetry.',
  ],

  'inventory.reserve': [
    'Inspect inventory_reservation_failed_total and reservation telemetry for the affected orders.',
    'Inspect db_query_duration_ms, db_connection_wait_ms, deadlock_total, and transaction rollback telemetry.',
    'Check for row-lock contention or concurrent reservation pressure on the same inventory records.',
    'Inspect the stock reservation database function and correlate using orderId and traceId.',
  ],

  'checkout.workflow': [
    'Inspect checkout.stage records for order.create, inventory.reserve, payment.authorize, and order.complete.',
    'Identify which Checkout stage contributes most to the increased checkout.workflow p95.',
    'Inspect payment_duration_ms and payment_timeout_total when payment.authorize is slow.',
    'Inspect database, inventory, and ordering telemetry for the identified slow stage using orderId and traceId.',
  ],

  'report.standard': [
    'Inspect the five Standard Report repository queries to identify the slowest query.',
    'Inspect db_query_duration_ms, slow_query_total, and db_connection_wait_ms during report generation.',
    'Review query execution plans and indexes for sales, refunds, products, payments, and inventory reporting queries.',
    'If data volume becomes large, evaluate a reporting read model or reporting database instead of increasing transactional database load.',
  ],
}

export function getPerformanceInvestigationSteps(
  operation: PerformanceOperation,
) {
  return [
    ...PERFORMANCE_INVESTIGATION_STEPS[
      operation
    ],
  ]
}

export function getPerformanceThreshold(
  operation: PerformanceOperation,
) {
  return PERFORMANCE_THRESHOLDS[
    operation
  ]
}

export function roundDurationMs(
  durationMs: number,
) {
  if (
    !Number.isFinite(
      durationMs,
    )
    || durationMs < 0
  ) {
    return 0
  }

  return Number(
    durationMs.toFixed(
      2,
    ),
  )
}

export function evaluatePerformanceDuration(
  operation: PerformanceOperation,
  durationMs: number,
): PerformanceStatus {
  const threshold =
    getPerformanceThreshold(
      operation,
    )

  if (
    durationMs
    >= threshold.criticalMs
  ) {
    return 'CRITICAL'
  }

  if (
    durationMs
    >= threshold.warningMs
  ) {
    return 'WARNING'
  }

  return 'HEALTHY'
}

/*
 * Monotonic timer for server-side
 * performance measurements.
 *
 * performance.now() is preferred over
 * Date.now() for elapsed duration because
 * it is not affected by wall-clock
 * adjustments.
 */
export function startPerformanceTimer() {
  const startedAtMs =
    performance.now()

  return {
    elapsedMs() {
      return roundDurationMs(
        performance.now()
        - startedAtMs,
      )
    },
  }
}

function calculateContinuousPercentile(
  sortedValues: number[],
  percentile: number,
) {
  if (
    sortedValues.length === 0
  ) {
    return 0
  }

  if (
    sortedValues.length === 1
  ) {
    return sortedValues[0]
      ?? 0
  }

  const position =
    (
      sortedValues.length
      - 1
    )
    * percentile

  const lowerIndex =
    Math.floor(
      position,
    )

  const upperIndex =
    Math.ceil(
      position,
    )

  const lower =
    sortedValues[
      lowerIndex
    ]
    ?? 0

  const upper =
    sortedValues[
      upperIndex
    ]
    ?? lower

  if (
    lowerIndex
    === upperIndex
  ) {
    return lower
  }

  const fraction =
    position
    - lowerIndex

  return lower
    + (
      upper
      - lower
    )
    * fraction
}

export function calculateDurationStatistics(
  samples: number[],
): DurationStatistics {
  const validSamples =
    samples
      .filter(
        sample =>
          Number.isFinite(
            sample,
          )
          && sample >= 0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left - right,
      )

  if (
    validSamples.length === 0
  ) {
    return {
      sampleCount: 0,
      averageMs: 0,
      minMs: 0,
      maxMs: 0,
      p95Ms: 0,
    }
  }

  const total =
    validSamples.reduce(
      (
        sum,
        duration,
      ) =>
        sum + duration,
      0,
    )

  const average =
    total
    / validSamples.length

  const min =
    validSamples[0]
    ?? 0

  const max =
    validSamples[
      validSamples.length
      - 1
    ]
    ?? 0

  const p95 =
    calculateContinuousPercentile(
      validSamples,
      0.95,
    )

  return {
    sampleCount:
      validSamples.length,

    averageMs:
      roundDurationMs(
        average,
      ),

    minMs:
      roundDurationMs(
        min,
      ),

    maxMs:
      roundDurationMs(
        max,
      ),

    p95Ms:
      roundDurationMs(
        p95,
      ),
  }
}