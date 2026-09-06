import {
  sql,
} from 'drizzle-orm'


interface InsertRequestLogInput {
  requestId: string
  traceId: string

  userId: number | null
  branchId: number | null
  orderId: number | null

  method: string
  path: string

  statusCode: number
  durationMs: number

  startedAt: Date
  completedAt: Date
}

export interface InsertTelemetryEventInput {
  eventName: string

  requestId?: string | null
  traceId?: string | null

  userId?: number | null
  branchId?: number | null
  orderId?: number | null

  source?: string | null
  result?: string | null

  metadata?: Record<
    string,
    unknown
  >
}

export async function insertRequestLog(
  input: InsertRequestLogInput,
) {
  const db =
    useDb()

  await db.execute(
    sql`
      INSERT INTO brewhub.request_logs (
        request_id,
        trace_id,
        user_id,
        branch_id,
        order_id,
        method,
        path,
        status_code,
        duration_ms,
        started_at,
        completed_at
      )
      VALUES (
        ${input.requestId}::uuid,
        ${input.traceId}::uuid,
        ${input.userId},
        ${input.branchId},
        ${input.orderId},
        ${input.method},
        ${input.path},
        ${input.statusCode},
        ${input.durationMs},
        ${input.startedAt},
        ${input.completedAt}
      )
    `,
  )
}

export async function insertTelemetryEvent(
  input: InsertTelemetryEventInput,
) {
  const db =
    useDb()

  const metadata =
    JSON.stringify(
      input.metadata
        ?? {},
    )

  await db.execute(
    sql`
      INSERT INTO brewhub.telemetry_events (
        event_name,

        request_id,
        trace_id,

        user_id,
        branch_id,
        order_id,

        source,
        result,

        metadata
      )
      VALUES (
        ${input.eventName},

        ${input.requestId ?? null}::uuid,
        ${input.traceId ?? null}::uuid,

        ${input.userId ?? null},
        ${input.branchId ?? null},
        ${input.orderId ?? null},

        ${input.source ?? null},
        ${input.result ?? null},

        ${metadata}::jsonb
      )
    `,
  )
}

interface RequestLogDbRow {
  id: string | number

  requestId: string
  traceId: string

  userId:
    | string
    | number
    | null

  branchId:
    | string
    | number
    | null

  orderId:
    | string
    | number
    | null

  method: string
  path: string

  statusCode: number
  durationMs: number

  startedAt:
    | Date
    | string

  completedAt:
    | Date
    | string
}

export async function findRecentRequestLogs(
  limit = 100,
) {
  const db =
    useDb()

  const safeLimit =
    Number.isFinite(limit)
      ? Math.min(
          Math.max(
            Math.trunc(limit),
            1,
          ),
          200,
        )
      : 100

  const result =
    await db.execute(
      sql`
        SELECT
          id,

          request_id::text
            AS "requestId",

          trace_id::text
            AS "traceId",

          user_id
            AS "userId",

          branch_id
            AS "branchId",

          order_id
            AS "orderId",

          method,
          path,

          status_code
            AS "statusCode",

          duration_ms
            AS "durationMs",

          started_at
            AS "startedAt",

          completed_at
            AS "completedAt"

        FROM brewhub.request_logs

        ORDER BY completed_at DESC

        LIMIT ${safeLimit}
      `,
    )

  return result.rows as unknown as RequestLogDbRow[]
}

export async function countRequestLogs() {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COUNT(*)::bigint
            AS "requestsTotal"

        FROM brewhub.request_logs
      `,
    )

  const row =
    result.rows[0] as
      | {
          requestsTotal:
            | string
            | number
        }
      | undefined

  return Number(
    row?.requestsTotal
      ?? 0,
  )
}

export async function countFailedRequestLogs() {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COUNT(*)::bigint
            AS "requestsFailedTotal"

        FROM brewhub.request_logs

        WHERE status_code >= 400
      `,
    )

  const row =
    result.rows[0] as
      | {
          requestsFailedTotal:
            | string
            | number
        }
      | undefined

  return Number(
    row?.requestsFailedTotal
      ?? 0,
  )
}

interface RequestDurationStatsDbRow {
  averageMs:
    | string
    | number

  minMs:
    | string
    | number

  maxMs:
    | string
    | number

  p95Ms:
    | string
    | number
}

interface PerformanceDurationStatsDbRow {
  sampleCount:
    | string
    | number

  averageMs:
    | string
    | number

  minMs:
    | string
    | number

  maxMs:
    | string
    | number

  p95Ms:
    | string
    | number
}

export async function getRequestDurationStats() {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COALESCE(
            AVG(duration_ms),
            0
          )::double precision
            AS "averageMs",

          COALESCE(
            MIN(duration_ms),
            0
          )
            AS "minMs",

          COALESCE(
            MAX(duration_ms),
            0
          )
            AS "maxMs",

          COALESCE(
            PERCENTILE_CONT(0.95)
              WITHIN GROUP (
                ORDER BY duration_ms
              ),
            0
          )::double precision
            AS "p95Ms"

        FROM brewhub.request_logs
      `,
    )

  const row =
    result.rows[0] as
      | RequestDurationStatsDbRow
      | undefined

  return {
    averageMs:
      Number(
        row?.averageMs
          ?? 0,
      ),

    minMs:
      Number(
        row?.minMs
          ?? 0,
      ),

    maxMs:
      Number(
        row?.maxMs
          ?? 0,
      ),

    p95Ms:
      Number(
        row?.p95Ms
          ?? 0,
      ),
  }
}

export async function getPerformanceDurationStats(
  operation: string,
) {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COUNT(*)::bigint
            AS "sampleCount",

          COALESCE(
            AVG(
              (
                metadata
                ->> 'durationMs'
              )::double precision
            ),
            0
          )::double precision
            AS "averageMs",

          COALESCE(
            MIN(
              (
                metadata
                ->> 'durationMs'
              )::double precision
            ),
            0
          )::double precision
            AS "minMs",

          COALESCE(
            MAX(
              (
                metadata
                ->> 'durationMs'
              )::double precision
            ),
            0
          )::double precision
            AS "maxMs",

          COALESCE(
            PERCENTILE_CONT(0.95)
              WITHIN GROUP (
                ORDER BY
                  (
                    metadata
                    ->> 'durationMs'
                  )::double precision
              ),
            0
          )::double precision
            AS "p95Ms"

        FROM brewhub.telemetry_events

        WHERE event_name =
          'performance.sample'

          AND metadata
            ->> 'operation'
            = ${operation}

          AND metadata
            ? 'durationMs'
      `,
    )

  const row =
    result.rows[0] as
      | PerformanceDurationStatsDbRow
      | undefined

  return {
    sampleCount:
      Number(
        row?.sampleCount
        ?? 0,
      ),

    averageMs:
      Number(
        row?.averageMs
        ?? 0,
      ),

    minMs:
      Number(
        row?.minMs
        ?? 0,
      ),

    maxMs:
      Number(
        row?.maxMs
        ?? 0,
      ),

    p95Ms:
      Number(
        row?.p95Ms
        ?? 0,
      ),
  }
}

export async function getCheckoutStageDurations(
  orderId: number,
  source: 'CUSTOMER' | 'POS',
) {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT DISTINCT ON (
          metadata ->> 'stage'
        )
          metadata ->> 'stage'
            AS "stage",

          (
            metadata ->> 'durationMs'
          )::double precision
            AS "durationMs"

        FROM brewhub.telemetry_events

        WHERE event_name =
          'checkout.stage'

          AND order_id =
            ${orderId}

          AND source =
            ${source}

          AND result =
            'success'

          AND metadata ->> 'stage'
            IN (
              'order.create',
              'inventory.reserve',
              'payment.authorize',
              'order.complete'
            )

          AND metadata
            ? 'durationMs'

        ORDER BY
          metadata ->> 'stage',
          created_at DESC,
          id DESC
      `,
    )

  const durations = {
    orderCreateMs:
      null as number | null,

    inventoryReserveMs:
      null as number | null,

    paymentAuthorizeMs:
      null as number | null,

    orderCompleteMs:
      null as number | null,
  }

  for (
    const rawRow
    of result.rows
  ) {
    const stage =
      typeof rawRow.stage === 'string'
      ? rawRow.stage
      : ''

    const durationMs =
      Number(
        rawRow.durationMs,
      )

    if (
      !Number.isFinite(
        durationMs,
      )
    ) {
      continue
    }

    switch (stage) {
      case 'order.create':
        durations.orderCreateMs =
          durationMs
        break

      case 'inventory.reserve':
        durations.inventoryReserveMs =
          durationMs
        break

      case 'payment.authorize':
        durations.paymentAuthorizeMs =
          durationMs
        break

      case 'order.complete':
        durations.orderCompleteMs =
          durationMs
        break
    }
  }

  return durations
}


export async function countActiveUsers(
  windowMinutes = 5,
) {
  const db =
    useDb()

  const safeWindowMinutes =
    Number.isFinite(
      windowMinutes,
    )
      ? Math.min(
          Math.max(
            Math.trunc(
              windowMinutes,
            ),
            1,
          ),
          60,
        )
      : 5

  const result =
    await db.execute(
      sql`
        SELECT
          COUNT(
            DISTINCT user_id
          )::bigint
            AS "activeUsers"

        FROM brewhub.request_logs

        WHERE user_id IS NOT NULL

          AND completed_at >=
            NOW()
            - (
                ${safeWindowMinutes}
                * INTERVAL '1 minute'
              )
      `,
    )

  const row =
    result.rows[0] as
      | {
          activeUsers:
            | string
            | number
        }
      | undefined

  return Number(
    row?.activeUsers
      ?? 0,
  )
}

export async function countTelemetryEventsByName(
  eventName: string,
) {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COUNT(*)::bigint
            AS "eventTotal"

        FROM brewhub.telemetry_events

        WHERE event_name =
          ${eventName}
      `,
    )

  const row =
    result.rows[0] as
      | {
          eventTotal:
            | string
            | number
        }
      | undefined

  return Number(
    row?.eventTotal
      ?? 0,
  )
}

export async function getCheckoutOutcomeMinuteBuckets(
  minuteCount: number,
) {
  const db =
    useDb()

  /*
   * Keep the internal query bounded.
   *
   * Task 11 currently uses five
   * consecutive one-minute buckets,
   * but this helper remains reusable.
   */
  const safeMinuteCount =
    Math.min(
      Math.max(
        Math.trunc(
          minuteCount,
        ),
        1,
      ),
      60,
    )

  const result =
    await db.execute(
      sql`
        WITH buckets AS (
          SELECT
            generate_series(
              date_trunc(
                'minute',
                CURRENT_TIMESTAMP
              )
              - (
                ${safeMinuteCount}::integer
                * interval '1 minute'
              ),

              date_trunc(
                'minute',
                CURRENT_TIMESTAMP
              )
              - interval '1 minute',

              interval '1 minute'
            ) AS "bucketStart"
        )

        SELECT
          buckets."bucketStart",

          COUNT(
            events.id
          ) FILTER (
            WHERE events.event_name =
              'checkout.success'
          )::bigint
            AS "successTotal",

          COUNT(
            events.id
          ) FILTER (
            WHERE events.event_name =
              'checkout.failure'
          )::bigint
            AS "failureTotal"

        FROM buckets

        LEFT JOIN
          brewhub.telemetry_events
            AS events
          ON
            events.created_at
              >= buckets."bucketStart"

            AND events.created_at
              < buckets."bucketStart"
                + interval '1 minute'

            AND events.event_name
              IN (
                'checkout.success',
                'checkout.failure'
              )

        GROUP BY
          buckets."bucketStart"

        ORDER BY
          buckets."bucketStart" ASC
      `,
    )

  return result.rows.map(
    (rawRow) => {
      const successTotal =
        Number(
          rawRow.successTotal
          ?? 0,
        )

      const failureTotal =
        Number(
          rawRow.failureTotal
          ?? 0,
        )

      return {
        bucketStart:
          rawRow.bucketStart,

        successTotal,

        failureTotal,

        checkoutTotal:
          successTotal
          + failureTotal,
      }
    },
  )
}

export async function getTelemetryEventComparisonWindowCounts(
  eventName: string,
  windowMinutes: number,
) {
  const db =
    useDb()

  const safeWindowMinutes =
    Math.min(
      Math.max(
        Math.trunc(
          windowMinutes,
        ),
        1,
      ),
      60,
    )

  const result =
    await db.execute(
      sql`
        WITH anchor AS (
          SELECT
            CURRENT_TIMESTAMP
              AS "now"
        )

        SELECT
          COUNT(*) FILTER (
            WHERE
              events.created_at
                >= anchor."now"
                  - (
                    ${safeWindowMinutes}::integer
                    * interval '1 minute'
                  )

              AND events.created_at
                < anchor."now"
          )::bigint
            AS "currentTotal",

          COUNT(*) FILTER (
            WHERE
              events.created_at
                >= anchor."now"
                  - (
                    (
                      ${safeWindowMinutes}::integer
                      * 2
                    )
                    * interval '1 minute'
                  )

              AND events.created_at
                < anchor."now"
                  - (
                    ${safeWindowMinutes}::integer
                    * interval '1 minute'
                  )
          )::bigint
            AS "previousTotal"

        FROM
          brewhub.telemetry_events
            AS events

        CROSS JOIN anchor

        WHERE
          events.event_name =
            ${eventName}
      `,
    )

  const row =
    result.rows[0] as
      | {
          currentTotal:
            | string
            | number

          previousTotal:
            | string
            | number
        }
      | undefined

  return {
    currentTotal:
      Number(
        row?.currentTotal
        ?? 0,
      ),

    previousTotal:
      Number(
        row?.previousTotal
        ?? 0,
      ),
  }
}

export async function getRepeatedLoginFailureAccount(
  windowMinutes: number,
) {
  const db =
    useDb()

  const safeWindowMinutes =
    Math.min(
      Math.max(
        Math.trunc(
          windowMinutes,
        ),
        1,
      ),
      60,
    )

  const result =
    await db.execute(
      sql`
        SELECT
          metadata ->> 'accountKey'
            AS "accountKey",

          COUNT(*)::bigint
            AS "failureCount"

        FROM
          brewhub.telemetry_events

        WHERE
          event_name =
            'security.login.failure'

          AND created_at
            >= CURRENT_TIMESTAMP
              - (
                ${safeWindowMinutes}::integer
                * interval '1 minute'
              )

          AND metadata
            ? 'accountKey'

          AND metadata ->> 'accountKey'
            IS NOT NULL

        GROUP BY
          metadata ->> 'accountKey'

        ORDER BY
          COUNT(*) DESC

        LIMIT 1
      `,
    )

  const row =
    result.rows[0] as
      | {
          accountKey:
            | string
            | null

          failureCount:
            | string
            | number
        }
      | undefined

  if (
    !row
    || !row.accountKey
  ) {
    return {
      accountKey:
        null,

      failureCount:
        0,
    }
  }

  return {
    accountKey:
      row.accountKey,

    failureCount:
      Number(
        row.failureCount
        ?? 0,
      ),
  }
}

export async function getTransactionRollbackTotal() {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COALESCE(
            xact_rollback,
            0
          )::bigint
            AS "transactionRollbackTotal"

        FROM pg_stat_database

        WHERE datname =
          current_database()

        LIMIT 1
      `,
    )

  const row =
    result.rows[0] as
      | {
          transactionRollbackTotal:
            | string
            | number
        }
      | undefined

  return Number(
    row?.transactionRollbackTotal
      ?? 0,
  )
}

export async function getDeadlockTotal() {
  const db =
    useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          COALESCE(
            deadlocks,
            0
          )::bigint
            AS "deadlockTotal"

        FROM pg_stat_database

        WHERE datname =
          current_database()

        LIMIT 1
      `,
    )

  const row =
    result.rows[0] as
      | {
          deadlockTotal:
            | string
            | number
        }
      | undefined

  return Number(
    row?.deadlockTotal
      ?? 0,
  )
}