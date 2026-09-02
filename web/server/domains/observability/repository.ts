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