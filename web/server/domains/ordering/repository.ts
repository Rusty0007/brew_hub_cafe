import {
  and,
  desc,
  eq,
  sql,
} from 'drizzle-orm'

import {
  branches,
  orderItems,
  orders,
} from '#server/db/schema'

import { useDb } from '#server/utils/db'

import type {
  CreateOrderRecordInput,
  OrderStatus,
} from './types'


export async function findActiveBranchByCode(
  code: string,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: branches.id,
      code: branches.code,
      name: branches.name,
      timezone: branches.timezone,
      isActive: branches.isActive,
    })
    .from(branches)
    .where(
      and(
        eq(branches.code, code),
        eq(branches.isActive, true),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function findOrderById(
  orderId: number,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,

      branchId: orders.branchId,
      customerId: orders.customerId,
      createdByUserId:
        orders.createdByUserId,

      source: orders.source,
      orderType: orders.orderType,
      status: orders.status,

      subtotal: orders.subtotal,

      discountAmount:
        orders.discountAmount,

      taxAmount:
        orders.taxAmount,

      totalAmount:
        orders.totalAmount,

      version: orders.version,

      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,

      completedAt:
        orders.completedAt,

      cancelledAt:
        orders.cancelledAt,

      cancellationReason:
        orders.cancellationReason,
    })
    .from(orders)
    .where(
      eq(
        orders.id,
        orderId,
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function transitionOrderStatus(
  orderId: number,
  expectedStatus: OrderStatus,
  nextStatus: OrderStatus,
  expectedVersion: number,
) {
  const db = useDb()

  const rows =
    await db
      .update(orders)
      .set({
        status:
          nextStatus,

        version:
          sql`${orders.version} + 1`,
      })
      .where(
        and(
          eq(
            orders.id,
            orderId,
          ),

          eq(
            orders.status,
            expectedStatus,
          ),

          eq(
            orders.version,
            expectedVersion,
          ),
        ),
      )
      .returning({
        id:
          orders.id,

        status:
          orders.status,

        version:
          orders.version,

        updatedAt:
          orders.updatedAt,
      })

  return rows[0] ?? null
}

export async function completeOrder(
  orderId: number,
  userId: number,
  traceId: string | null = null,
) {
  const db = useDb()

  await db.execute(
    sql`
      CALL brewhub.sp_complete_order(
        ${orderId},
        ${userId},
        ${traceId}
      )
    `,
  )
}

export async function simulateDatabaseRollback(
  orderId: number,
) {
  const db = useDb()

  /*
   * Capture the persisted state before
   * starting the test transaction.
   */
  const beforeRows =
    await db
      .select({
        id:
          orders.id,

        status:
          orders.status,

        version:
          orders.version,
      })
      .from(orders)
      .where(
        eq(
          orders.id,
          orderId,
        ),
      )
      .limit(1)

  const before =
    beforeRows[0]

  if (!before) {
    throw new Error(
      'Order not found for rollback test',
    )
  }

  let databaseErrorMessage =
    'Database transaction failed'

  try {
    await db.transaction(
      async (tx) => {
        /*
         * Make a real database change
         * inside the transaction.
         *
         * This must disappear when the
         * transaction rolls back.
         */
        await tx
          .update(orders)
          .set({
            version:
              sql`${orders.version} + 1`,
          })
          .where(
            eq(
              orders.id,
              orderId,
            ),
          )

        /*
         * Deliberately trigger a real
         * PostgreSQL error.
         *
         * Division by zero causes
         * PostgreSQL to abort the
         * transaction.
         */
        await tx.execute(
          sql`
            SELECT
              1 / 0
              AS tesda_simulated_database_failure
          `,
        )
      },
    )
  }
  catch (error: unknown) {
    databaseErrorMessage =
      error instanceof Error
        ? error.message
        : 'Database transaction failed'
  }

  /*
   * Read the order again AFTER PostgreSQL
   * rolled the failed transaction back.
   */
  const afterRows =
    await db
      .select({
        id:
          orders.id,

        status:
          orders.status,

        version:
          orders.version,
      })
      .from(orders)
      .where(
        eq(
          orders.id,
          orderId,
        ),
      )
      .limit(1)

  const after =
    afterRows[0]

  if (!after) {
    throw new Error(
      'Order disappeared after rollback test',
    )
  }

  const rolledBack =
    before.version === after.version
    && before.status === after.status

  if (!rolledBack) {
    throw new Error(
      'Database rollback verification failed',
    )
  }

  return {
    orderId:
      before.id,

    beforeVersion:
      before.version,

    afterVersion:
      after.version,

    beforeStatus:
      before.status,

    afterStatus:
      after.status,

    rolledBack,

    databaseErrorMessage,
  }
}

export async function cancelOrder(
  orderId: number,
  userId: number,
  reason: string,
  traceId: string | null = null,
) {
  const db = useDb()

  await db.execute(
    sql`
      CALL brewhub.sp_cancel_order(
        ${orderId},
        ${userId},
        ${reason},
        ${traceId}
      )
    `,
  )
}

export async function recoverExpiredPendingOrders(
  limit = 100,
) {
  const db = useDb()

  await db.execute(
    sql`
      CALL brewhub.sp_recover_expired_pending_orders(
        ${limit}
      )
    `,
  )
}

export async function findOrderItemsByOrderId(
  orderId: number,
) {
  const db = useDb()

  return db
    .select({
      id: orderItems.id,

      orderId:
        orderItems.orderId,

      productId:
        orderItems.productId,

      skuSnapshot:
        orderItems.skuSnapshot,

      productNameSnapshot:
        orderItems.productNameSnapshot,

      quantity:
        orderItems.quantity,

      unitPrice:
        orderItems.unitPrice,

      discountAmount:
        orderItems.discountAmount,

      lineTotal:
        orderItems.lineTotal,

      createdAt:
        orderItems.createdAt,
    })
    .from(orderItems)
    .where(
      eq(
        orderItems.orderId,
        orderId,
      ),
    )
    .orderBy(
      orderItems.id,
    )
}

export async function findOrdersByCustomerId(
  customerId: number,
) {
  const db = useDb()

  return db
    .select({
      id: orders.id,

      orderNo:
        orders.orderNo,

      source:
        orders.source,

      orderType:
        orders.orderType,

      status:
        orders.status,

      subtotal:
        orders.subtotal,

      discountAmount:
        orders.discountAmount,

      taxAmount:
        orders.taxAmount,

      totalAmount:
        orders.totalAmount,

      createdAt:
        orders.createdAt,

      completedAt:
        orders.completedAt,

      cancelledAt:
        orders.cancelledAt,
    })
    .from(orders)
    .where(
      eq(
        orders.customerId,
        customerId,
      ),
    )
    .orderBy(
      desc(
        orders.createdAt,
      ),
    )
}

export async function findRecentOrders(
  limit = 50,
) {
  const db = useDb()

  const safeLimit =
    Math.min(
      Math.max(
        limit,
        1,
      ),
      100,
    )

  return db
    .select({
      id:
        orders.id,

      orderNo:
        orders.orderNo,

      branchId:
        orders.branchId,

      customerId:
        orders.customerId,

      createdByUserId:
        orders.createdByUserId,

      source:
        orders.source,

      orderType:
        orders.orderType,

      status:
        orders.status,

      subtotal:
        orders.subtotal,

      discountAmount:
        orders.discountAmount,

      taxAmount:
        orders.taxAmount,

      totalAmount:
        orders.totalAmount,

      version:
        orders.version,

      createdAt:
        orders.createdAt,

      completedAt:
        orders.completedAt,

      cancelledAt:
        orders.cancelledAt,
    })
    .from(orders)
    .orderBy(
      desc(
        orders.createdAt,
      ),
    )
    .limit(
      safeLimit,
    )
}

export async function insertOrderWithItems(
  input: CreateOrderRecordInput,
) {
  const db = useDb()

  return db.transaction(
    async (tx) => {
      /*
       * 1. Create the order header.
       */
      const insertedOrders =
        await tx
          .insert(orders)
          .values({
            orderNo:
              input.orderNo,

            branchId:
              input.branchId,

            customerId:
              input.customerId,

            createdByUserId:
              input.createdByUserId,

            source:
              input.source,

            orderType:
              input.orderType,

            status:
              'DRAFT',
          })
          .returning({
            id: orders.id,
            orderNo:
              orders.orderNo,
          })

      const order =
        insertedOrders[0]

      if (!order) {
        throw new Error(
          'Unable to create order',
        )
      }

      /*
       * 2. Insert item snapshots.
       *
       * Prices and product names have already
       * been validated by the service layer.
       */
      await tx
        .insert(orderItems)
        .values(
          input.items.map(
            item => ({
              orderId:
                order.id,

              productId:
                item.productId,

              skuSnapshot:
                item.skuSnapshot,

              productNameSnapshot:
                item.productNameSnapshot,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              discountAmount:
                item.discountAmount,
            }),
          ),
        )

      /*
       * The PostgreSQL
       * trg_order_items_recalculate_totals
       * trigger has now recalculated the
       * order subtotal.
       *
       * Re-select the order so we receive
       * the final calculated totals.
       */
      const finalOrders =
        await tx
          .select({
            id:
              orders.id,

            orderNo:
              orders.orderNo,

            branchId:
              orders.branchId,

            customerId:
              orders.customerId,

            createdByUserId:
              orders.createdByUserId,

            source:
              orders.source,

            orderType:
              orders.orderType,

            status:
              orders.status,

            subtotal:
              orders.subtotal,

            discountAmount:
              orders.discountAmount,

            taxAmount:
              orders.taxAmount,

            totalAmount:
              orders.totalAmount,

            version:
              orders.version,

            createdAt:
              orders.createdAt,
          })
          .from(orders)
          .where(
            eq(
              orders.id,
              order.id,
            ),
          )
          .limit(1)

      const finalOrder =
        finalOrders[0]

      if (!finalOrder) {
        throw new Error(
          'Unable to reload created order',
        )
      }

      return finalOrder
    },
  )
}