import {
  createHash,
} from 'node:crypto'

import {
  beginIdempotentRequest,
  finishIdempotentRequest,
} from './repository'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

const IDEMPOTENCY_TTL_MS =
  24 * 60 * 60 * 1000

export interface BeginIdempotentOperationInput {
  idempotencyKey: string
  operation: string
  requestData: unknown
  branchId?: number | null
  userId?: number | null
}

export interface FinishIdempotentOperationInput {
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

/*
 * Produce the 64-character SHA-256
 * request hash expected by PostgreSQL.
 */
export function createRequestHash(
  requestData: unknown,
) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        requestData,
      ),
    )
    .digest('hex')
}

export async function beginIdempotentOperation(
  input: BeginIdempotentOperationInput,
) {
  const idempotencyKey =
    input.idempotencyKey.trim()

  if (!idempotencyKey) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Idempotency-Key is required',
    })
  }

  if (
    idempotencyKey.length > 160
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Idempotency-Key is too long',
    })
  }

  const requestHash =
    createRequestHash(
      input.requestData,
    )

  const expiresAt =
    new Date(
      Date.now()
        + IDEMPOTENCY_TTL_MS,
    )

  const result =
    await beginIdempotentRequest({
      idempotencyKey,
      operation:
        input.operation,
      requestHash,
      expiresAt,
      branchId:
        input.branchId ?? null,
      userId:
        input.userId ?? null,
    })
  
  /*
   * Task 9 telemetry:
   * every protected request contributes
   * to idempotency_request_total.
   */
  logInfo(
    'idempotency.request',
    {
      operation:
        input.operation,
    
      decision:
        result.decision,
    
      storedStatus:
        result.storedStatus,
    
      userId:
        input.userId ?? null,
    
      branchId:
        input.branchId ?? null,
    },
  )
  
  /*
   * REPLAY means the same logical request
   * was received again and the original
   * result will be reused.
   */
  if (
    result.decision
    === 'REPLAY'
  ) {
    logInfo(
      'idempotency.duplicate',
      {
        operation:
          input.operation,
      
        decision:
          result.decision,
      
        storedStatus:
          result.storedStatus,
      
        userId:
          input.userId ?? null,
      
        branchId:
          input.branchId ?? null,
      
        duplicatePrevented:
          true,
      },
    )
  }
  
  /*
   * CONFLICT means the same key was reused
   * for different request data.
   */
  if (
    result.decision
    === 'CONFLICT'
  ) {
    logWarn(
      'idempotency.conflict',
      {
        operation:
          input.operation,
      
        decision:
          result.decision,
      
        storedStatus:
          result.storedStatus,
      
        userId:
          input.userId ?? null,
      
        branchId:
          input.branchId ?? null,
      },
    )
  }
  
  /*
   * IN_PROGRESS means another request with
   * the same logical operation is still
   * processing.
   */
  if (
    result.decision
    === 'IN_PROGRESS'
  ) {
    logWarn(
      'idempotency.processing',
      {
        operation:
          input.operation,
      
        decision:
          result.decision,
      
        storedStatus:
          result.storedStatus,
      
        userId:
          input.userId ?? null,
      
        branchId:
          input.branchId ?? null,
      },
    )
  }
  
  return {
    ...result,
    idempotencyKey,
    requestHash,
  }
}

export async function finishIdempotentOperation(
  input: FinishIdempotentOperationInput,
) {
  await finishIdempotentRequest({
    idempotencyKey:
      input.idempotencyKey,

    operation:
      input.operation,

    requestHash:
      input.requestHash,

    status:
      input.status,

    resultReference:
      input.resultReference
      ?? null,

    responseCode:
      input.responseCode
      ?? null,

    responseBody:
      input.responseBody
      ?? null,
  })
}