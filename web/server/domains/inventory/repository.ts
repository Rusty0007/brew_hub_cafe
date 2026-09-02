import {
    and,
    desc,
    eq,
  sql,
} from 'drizzle-orm'

import {
  inventory,
  inventoryReservations,
  products,
  stockMovements,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

import type {
  AdjustStockInput,
  ReceiveStockInput,
  ReleaseReservationInput,
  ReserveStockInput,
  StockMovementQuery
} from './types'

function normalizeId(
  value: unknown,
  operation: string,
) {
  const id =
    Number(value)

  if (
    !Number.isSafeInteger(id)
    || id <= 0
  ) {
    throw new Error(
      `${operation} returned an invalid identifier`,
    )
  }

  return id
}

export async function reserveStock(
  input: ReserveStockInput,
) {
  const db = useDb()

  const expiresAt =
    input.expiresAt
      ? input.expiresAt.toISOString()
      : null

  const result =
    await db.execute(
      sql`
        SELECT
          brewhub.fn_reserve_stock(
            ${input.orderId}::bigint,
            ${input.productId}::bigint,
            ${input.quantity}::numeric,
            ${expiresAt}::timestamptz,
            ${input.userId ?? null}::bigint,
            ${input.traceId ?? null}::varchar
          ) AS reservation_id
      `,
    )

  const row =
    result.rows[0] as
      | {
          reservation_id:
            string | number
        }
      | undefined

  if (!row) {
    throw new Error(
      'Stock reservation returned no result',
    )
  }

  return normalizeId(
    row.reservation_id,
    'Stock reservation',
  )
}

export async function releaseReservation(
  input: ReleaseReservationInput,
) {
  const db = useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          brewhub.fn_release_reservation(
            ${input.reservationId}::bigint,
            ${
              input.reason
              ?? 'Reservation released'
            }::text,
            ${input.userId ?? null}::bigint,
            ${input.traceId ?? null}::varchar,
            ${
              input.finalStatus
              ?? 'RELEASED'
            }::varchar
          ) AS released
      `,
    )

  const row =
    result.rows[0] as
      | {
          released: boolean
        }
      | undefined

  if (!row) {
    throw new Error(
      'Reservation release returned no result',
    )
  }

  return row.released
}

export async function receiveStock(
  input: ReceiveStockInput,
) {
  const db = useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          brewhub.fn_receive_stock(
            ${input.branchId}::bigint,
            ${input.productId}::bigint,
            ${input.quantity}::numeric,
            ${input.reference ?? null}::varchar,
            ${
              input.reason
              ?? 'Stock received'
            }::text,
            ${input.userId ?? null}::bigint,
            ${input.traceId ?? null}::varchar
          ) AS movement_id
      `,
    )

  const row =
    result.rows[0] as
      | {
          movement_id:
            string | number
        }
      | undefined

  if (!row) {
    throw new Error(
      'Stock receipt returned no result',
    )
  }

  return normalizeId(
    row.movement_id,
    'Stock receipt',
  )
}

export async function adjustStock(
  input: AdjustStockInput,
) {
  const db = useDb()

  const result =
    await db.execute(
      sql`
        SELECT
          brewhub.fn_adjust_stock(
            ${input.branchId}::bigint,
            ${input.productId}::bigint,
            ${input.delta}::numeric,
            ${input.reason}::text,
            ${input.userId}::bigint,
            ${input.traceId ?? null}::varchar
          ) AS movement_id
      `,
    )

  const row =
    result.rows[0] as
      | {
          movement_id:
            string | number
        }
      | undefined

  if (!row) {
    throw new Error(
      'Stock adjustment returned no result',
    )
  }

  return normalizeId(
    row.movement_id,
    'Stock adjustment',
  )
}

export async function findInventoryByBranch(
  branchId: number,
) {
  const db = useDb()

  return await db
    .select({
      id: inventory.id,
      branchId:
        inventory.branchId,
      productId:
        inventory.productId,

      sku: products.sku,
      productName:
        products.name,

      onHandQty:
        inventory.onHandQty,
      reservedQty:
        inventory.reservedQty,
      availableQty:
        inventory.availableQty,
      reorderLevel:
        inventory.reorderLevel,

      version:
        inventory.version,
      updatedAt:
        inventory.updatedAt,
    })
    .from(inventory)
    .innerJoin(
      products,
      eq(
        inventory.productId,
        products.id,
      ),
    )
    .where(
      eq(
        inventory.branchId,
        branchId,
      ),
    )
    .orderBy(
      products.name,
    )
}

export async function findInventoryByProduct(
  branchId: number,
  productId: number,
) {
  const db = useDb()

  const rows =
    await db
      .select({
        id: inventory.id,
        branchId:
          inventory.branchId,
        productId:
          inventory.productId,

        sku: products.sku,
        productName:
          products.name,

        onHandQty:
          inventory.onHandQty,
        reservedQty:
          inventory.reservedQty,
        availableQty:
          inventory.availableQty,
        reorderLevel:
          inventory.reorderLevel,

        version:
          inventory.version,
        updatedAt:
          inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(
        products,
        eq(
          inventory.productId,
          products.id,
        ),
      )
      .where(
        and(
          eq(
            inventory.branchId,
            branchId,
          ),
          eq(
            inventory.productId,
            productId,
          ),
        ),
      )
      .limit(1)

  return rows[0] ?? null
}

export async function findActiveReservationsByOrder(
  orderId: number,
) {
  const db = useDb()

  return await db
    .select({
      id:
        inventoryReservations.id,

      orderId:
        inventoryReservations.orderId,

      branchId:
        inventoryReservations.branchId,

      productId:
        inventoryReservations.productId,

      sku:
        products.sku,

      productName:
        products.name,

      quantity:
        inventoryReservations.quantity,

      status:
        inventoryReservations.status,

      expiresAt:
        inventoryReservations.expiresAt,

      createdAt:
        inventoryReservations.createdAt,

      updatedAt:
        inventoryReservations.updatedAt,
    })
    .from(
      inventoryReservations,
    )
    .innerJoin(
      products,
      eq(
        inventoryReservations.productId,
        products.id,
      ),
    )
    .where(
      and(
        eq(
          inventoryReservations.orderId,
          orderId,
        ),
        eq(
          inventoryReservations.status,
          'ACTIVE',
        ),
      ),
    )
    .orderBy(
      inventoryReservations.productId,
    )
}

export async function findReservationsByOrder(
  orderId: number,
) {
  const db = useDb()

  return await db
    .select({
      id:
        inventoryReservations.id,

      orderId:
        inventoryReservations.orderId,

      branchId:
        inventoryReservations.branchId,

      productId:
        inventoryReservations.productId,

      sku:
        products.sku,

      productName:
        products.name,

      quantity:
        inventoryReservations.quantity,

      status:
        inventoryReservations.status,

      expiresAt:
        inventoryReservations.expiresAt,

      createdAt:
        inventoryReservations.createdAt,

      updatedAt:
        inventoryReservations.updatedAt,
    })
    .from(
      inventoryReservations,
    )
    .innerJoin(
      products,
      eq(
        inventoryReservations.productId,
        products.id,
      ),
    )
    .where(
      eq(
        inventoryReservations.orderId,
        orderId,
      ),
    )
    .orderBy(
      inventoryReservations.productId,
    )
}

export async function countStockMovements() {
  const db =
    useDb()

  const rows =
    await db
      .select({
        total:
          sql<number>`
            COUNT(*)::integer
          `,
      })
      .from(
        stockMovements,
      )

  return rows[0]?.total ?? 0
}

export async function findStockMovements(
  query: StockMovementQuery,
) {
  const db = useDb()

  const conditions = [
    eq(
      stockMovements.branchId,
      query.branchId,
    ),
  ]

  if (
    query.productId !== undefined
  ) {
    conditions.push(
      eq(
        stockMovements.productId,
        query.productId,
      ),
    )
  }

  if (
    query.orderId !== undefined
  ) {
    conditions.push(
      eq(
        stockMovements.orderId,
        query.orderId,
      ),
    )
  }

  const limit = Math.min(
    Math.max(
      query.limit ?? 100,
      1,
    ),
    500,
  )

  return await db
    .select({
      id:
        stockMovements.id,

      branchId:
        stockMovements.branchId,

      productId:
        stockMovements.productId,

      sku:
        products.sku,

      productName:
        products.name,

      orderId:
        stockMovements.orderId,

      reservationId:
        stockMovements.reservationId,

      movementType:
        stockMovements.movementType,

      onHandDelta:
        stockMovements.onHandDelta,

      reservedDelta:
        stockMovements.reservedDelta,

      onHandAfter:
        stockMovements.onHandAfter,

      reservedAfter:
        stockMovements.reservedAfter,

      reference:
        stockMovements.reference,

      reason:
        stockMovements.reason,

      createdByUserId:
        stockMovements.createdByUserId,

      traceId:
        stockMovements.traceId,

      createdAt:
        stockMovements.createdAt,
    })
    .from(
      stockMovements,
    )
    .innerJoin(
      products,
      eq(
        stockMovements.productId,
        products.id,
      ),
    )
    .where(
      and(
        ...conditions,
      ),
    )
    .orderBy(
      desc(
        stockMovements.createdAt,
      ),
      desc(
        stockMovements.id,
      ),
    )
    .limit(limit)
}