import { z } from 'zod'

import {
  adjustStock as adjustStockRecord,
  countStockMovements,
  findActiveReservationsByOrder,
  findInventoryByBranch,
  findInventoryByProduct,
  findStockMovements,
  findReservationsByOrder,
  receiveStock as receiveStockRecord,
  releaseReservation as releaseReservationRecord,
  reserveStock as reserveStockRecord,
} from './repository'

import {
  logInfo,
} from '#server/utils/logger'

/*
 * PostgreSQL inventory quantities use
 * NUMERIC(..., 3), so BrewHub accepts
 * values with at most three decimals.
 */
const quantitySchema = z
  .number()
  .finite()
  .positive()
  .refine(
    value =>
      Number.isInteger(
        value * 1000,
      ),
    {
      message:
        'Quantity may contain at most three decimal places.',
    },
  )

export const reserveStockSchema =
  z.object({
    orderId: z
      .number()
      .int()
      .positive(),

    productId: z
      .number()
      .int()
      .positive(),

    quantity:
      quantitySchema,

    expiresAt: z
      .date()
      .nullable()
      .optional(),

    userId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    traceId: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
  })

export const releaseReservationSchema =
  z.object({
    reservationId: z
      .number()
      .int()
      .positive(),

    reason: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),

    userId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    traceId: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),

    finalStatus: z
      .enum([
        'RELEASED',
        'EXPIRED',
      ])
      .optional(),
  })

export const receiveStockSchema =
  z.object({
    branchId: z
      .number()
      .int()
      .positive(),

    productId: z
      .number()
      .int()
      .positive(),

    quantity:
      quantitySchema,

    reference: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),

    reason: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),

    userId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    traceId: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
  })

export const adjustStockSchema =
  z.object({
    branchId: z
      .number()
      .int()
      .positive(),

    productId: z
      .number()
      .int()
      .positive(),

    delta: z
      .number()
      .finite()
      .refine(
        value =>
          value !== 0,
        {
          message:
            'Adjustment must be non-zero.',
        },
      )
      .refine(
        value =>
          Number.isInteger(
            value * 1000,
          ),
        {
          message:
            'Adjustment may contain at most three decimal places.',
        },
      ),

    reason: z
      .string()
      .trim()
      .min(
        1,
        'Adjustment reason is required.',
      )
      .max(500),

    userId: z
      .number()
      .int()
      .positive(),

    traceId: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
  })

  const positiveIdSchema = z
  .number()
  .int()
  .positive()

export const stockMovementQuerySchema =
  z.object({
    branchId:
      positiveIdSchema,

    productId:
      positiveIdSchema
        .optional(),

    orderId:
      positiveIdSchema
        .optional(),

    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional(),
  })

export async function getInventoryByBranch(
  branchId: number,
) {
  const validBranchId =
    positiveIdSchema.parse(
      branchId,
    )

  const rows =
    await findInventoryByBranch(
      validBranchId,
    )

  return rows.map(
    normalizeInventory,
  )
}

export async function getInventoryByProduct(
  branchId: number,
  productId: number,
) {
  const validBranchId =
    positiveIdSchema.parse(
      branchId,
    )

  const validProductId =
    positiveIdSchema.parse(
      productId,
    )

  const row =
    await findInventoryByProduct(
      validBranchId,
      validProductId,
    )

  if (!row) {
    return null
  }

  return normalizeInventory(
    row,
  )
}

export async function getActiveOrderReservations(
  orderId: number,
) {
  const validOrderId =
    positiveIdSchema.parse(
      orderId,
    )

  const rows =
    await findActiveReservationsByOrder(
      validOrderId,
    )

  return rows.map(
    row => ({
      ...row,

      quantity:
        Number(
          row.quantity,
        ),
    }),
  )
}

export async function getOrderReservations(
  orderId: number,
) {
  const validOrderId =
    positiveIdSchema.parse(
      orderId,
    )

  const rows =
    await findReservationsByOrder(
      validOrderId,
    )

  return rows.map(
    row => ({
      ...row,

      quantity:
        Number(
          row.quantity,
        ),
    }),
  )
}

export async function getStockMovementHistory(
  input: z.infer<
    typeof stockMovementQuerySchema
  >,
) {
  const parsed =
    stockMovementQuerySchema.parse(
      input,
    )

  const rows =
    await findStockMovements(
      parsed,
    )

  return rows.map(
    row => ({
      ...row,

      onHandDelta:
        Number(
          row.onHandDelta,
        ),

      reservedDelta:
        Number(
          row.reservedDelta,
        ),

      onHandAfter:
        Number(
          row.onHandAfter,
        ),

      reservedAfter:
        Number(
          row.reservedAfter,
        ),
    }),
  )
}

export type ReserveStockServiceInput =
  z.infer<
    typeof reserveStockSchema
  >

export type ReleaseReservationServiceInput =
  z.infer<
    typeof releaseReservationSchema
  >

export type ReceiveStockServiceInput =
  z.infer<
    typeof receiveStockSchema
  >

export type AdjustStockServiceInput =
  z.infer<
    typeof adjustStockSchema
  >

export async function getStockMovementTotal() {
  return await countStockMovements()
}

export async function reserveStockForOrder(
  input: ReserveStockServiceInput,
) {
  const parsed =
    reserveStockSchema.parse(
      input,
    )

  try {
    const reservationId =
      await reserveStockRecord(
        parsed,
      )

    return {
      reservationId,
    }
  }
  catch (error) {
    throw translateInventoryError(
      error,
    )
  }
}

export async function releaseStockReservation(
  input:
    ReleaseReservationServiceInput,
) {
  const parsed =
    releaseReservationSchema.parse(
      input,
    )

  try {
    const released =
      await releaseReservationRecord(
        parsed,
      )

    return {
      released,
    }
  }
  catch (error) {
    throw translateInventoryError(
      error,
    )
  }
}

export async function receiveInventoryStock(
  input: ReceiveStockServiceInput,
) {
  const parsed =
    receiveStockSchema.parse(
      input,
    )

  try {
    const movementId =
      await receiveStockRecord(
        parsed,
      )

    return {
      movementId,
    }
  }
  catch (error) {
    throw translateInventoryError(
      error,
    )
  }
}

export async function adjustInventoryStock(
  input: AdjustStockServiceInput,
) {
  const parsed =
    adjustStockSchema.parse(
      input,
    )

  try {
    const movementId =
      await adjustStockRecord(
        parsed,
      )

    logInfo(
      'stock.adjustment',
      {
        userId:
          parsed.userId,
      
        branchId:
          parsed.branchId,
      
        traceId:
          parsed.traceId
          ?? null,
      
        productId:
          parsed.productId,
      
        movementId,
      
        delta:
          parsed.delta,
      
        result:
          'success',
      },
    )

    return {
      movementId,
    }
  }
    catch (error) {
    const message =
      getErrorMessage(
        error,
      )

    if (
      message.includes(
        'Adjustment would violate stock invariant',
      )
    ) {
      logInfo(
        'negative_stock_attempt',
        {
          userId:
            parsed.userId,

          branchId:
            parsed.branchId,

          traceId:
            parsed.traceId
            ?? null,

          productId:
            parsed.productId,

          delta:
            parsed.delta,

          result:
            'prevented',
        },
      )
    }

    throw translateInventoryError(
      error,
    )
  }
}

/*
 * PostgreSQL functions deliberately raise
 * exceptions when an Inventory business
 * invariant is violated.
 *
 * Translate expected database messages
 * into API-safe application errors.
 */
function translateInventoryError(
  error: unknown,
) {
  const message =
    getErrorMessage(
      error,
    )

  if (
    message.includes(
      'Insufficient stock',
    )
  ) {
    return createError({
      statusCode: 409,
      statusMessage:
        'Insufficient stock',
    })
  }

  if (
    message.includes(
      'No inventory row',
    )
  ) {
    return createError({
      statusCode: 409,
      statusMessage:
        'Inventory is unavailable for this product',
    })
  }

  if (
    message.includes(
      'Active reservation already exists',
    )
  ) {
    return createError({
      statusCode: 409,
      statusMessage:
        'A different active stock reservation already exists',
    })
  }

  if (
    message.includes(
      'Order',
    )
    && message.includes(
      'not found',
    )
  ) {
    return createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  if (
    message.includes(
      'Reservation',
    )
    && message.includes(
      'not found',
    )
  ) {
    return createError({
      statusCode: 404,
      statusMessage:
        'Stock reservation not found',
    })
  }

  if (
    message.includes(
      'Adjustment would violate stock invariant',
    )
  ) {
    return createError({
      statusCode: 409,
      statusMessage:
        'Stock adjustment would make available inventory invalid',
    })
  }

  /*
   * These indicate an unexpected database
   * consistency problem. Do not expose
   * internal details to the client.
   */
  if (
    message.includes(
      'Inventory reservation invariant violated',
    )
    || message.includes(
      'Inventory row missing for reservation',
    )
  ) {
    return createError({
      statusCode: 500,
      statusMessage:
        'Inventory consistency error',
    })
  }

  /*
   * Unknown errors should keep their
   * original stack/context for server logs.
   */
  return error
}

function getErrorMessage(
  error: unknown,
): string {
  const messages: string[] = []

  let current: unknown =
    error

  const visited =
    new Set<unknown>()

  while (
    current
    && typeof current === 'object'
    && !visited.has(current)
  ) {
    visited.add(current)

    if (
      'message' in current
      && typeof current.message
        === 'string'
    ) {
      messages.push(
        current.message,
      )
    }

    if (
      'cause' in current
    ) {
      current =
        current.cause

      continue
    }

    break
  }

  return messages.join(
    '\n',
  )
}

function normalizeInventory<
  T extends {
    onHandQty: string
    reservedQty: string
    availableQty: string | null
    reorderLevel: string
  },
>(
  row: T,
) {
  return {
    ...row,

    onHandQty:
      Number(
        row.onHandQty,
      ),

    reservedQty:
      Number(
        row.reservedQty,
      ),

    availableQty:
      Number(
        row.availableQty
        ?? 0,
      ),

    reorderLevel:
      Number(
        row.reorderLevel,
      ),
  }
}

