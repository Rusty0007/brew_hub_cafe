import { sql } from 'drizzle-orm'

import { useDb } from '#server/utils/db'

export interface BeginIdempotentRequestInput {
  idempotencyKey: string
  operation: string
  requestHash: string
  expiresAt: Date
  branchId?: number | null
  userId?: number | null
}

export interface BeginIdempotentRequestResult {
  decision:
    | 'PROCESS'
    | 'CONFLICT'
    | 'IN_PROGRESS'
    | 'REPLAY'

  storedStatus:
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'

  resultReference:
    | string
    | null

  responseCode:
    | number
    | null

  responseBody:
    | unknown
    | null
}

export interface FinishIdempotentRequestInput {
  idempotencyKey: string
  operation: string
  requestHash: string
  status:
    | 'SUCCEEDED'
    | 'FAILED'
  resultReference?: string | null
  responseCode?: number | null
  responseBody?: unknown | null
}

export async function beginIdempotentRequest(
  input: BeginIdempotentRequestInput,
): Promise<BeginIdempotentRequestResult> {
  const db = useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          decision,
          stored_status,
          result_reference,
          response_code,
          response_body
        FROM brewhub.fn_begin_idempotent_request(
          ${input.idempotencyKey},
          ${input.operation},
          ${input.requestHash},
          ${input.expiresAt},
          ${input.branchId ?? null},
          ${input.userId ?? null}
        )
      `,
    )

  const row = result.rows[0]

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to begin idempotent request',
    })
  }

  return {
    decision:
      row.decision as
        BeginIdempotentRequestResult['decision'],

    storedStatus:
      row.stored_status as
        BeginIdempotentRequestResult['storedStatus'],

    resultReference:
      row.result_reference
        ? String(
            row.result_reference,
          )
        : null,

    responseCode:
      row.response_code === null
        || row.response_code === undefined
        ? null
        : Number(
            row.response_code,
          ),

    responseBody:
      row.response_body
        ?? null,
  }
}

export async function finishIdempotentRequest(
  input: FinishIdempotentRequestInput,
) {
  const db = useDb()

  await db.execute(
    sql`
      CALL brewhub.sp_finish_idempotent_request(
        ${input.idempotencyKey},
        ${input.operation},
        ${input.requestHash},
        ${input.status},
        ${input.resultReference ?? null},
        ${input.responseCode ?? null},
        ${input.responseBody ?? null}
      )
    `,
  )
}