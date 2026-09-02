import {
  randomUUID,
} from 'node:crypto'

import { z } from 'zod'

import {
  getOrderableProducts,
} from '#server/domains/catalog/service'

import {
  getActiveCustomerByUserId,
} from '#server/domains/customer/service'

import {
  getOrderReservations,
  getStockMovementHistory,
  releaseStockReservation,
  reserveStockForOrder,
} from '#server/domains/inventory/service'

import {
  getPaymentsByOrder,
} from '#server/domains/payment/service'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

import {
  cancelOrder,
  findActiveBranchByCode,
  findOrderById,
  findOrderItemsByOrderId,
  findOrdersByCustomerId,
  insertOrderWithItems,
  transitionOrderStatus,
  findRecentOrders
} from './repository'

export const createCustomerOrderSchema =
  z.object({
    orderType: z.enum([
      'DINE_IN',
      'TAKEOUT',
    ]),

    items: z
      .array(
        z.object({
          productId: z
            .number()
            .int()
            .positive(),

          quantity: z
            .number()
            .int()
            .positive()
            .max(
              100,
              'Maximum quantity per product is 100.',
            ),
        }),
      )
      .min(
        1,
        'Order must contain at least one item.',
      )
      .max(
        50,
        'Order contains too many items.',
      ),
})

export const cancelCustomerOrderSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        'Cancellation reason is required.',
      )
      .max(
        500,
        'Cancellation reason is too long.',
      ),
  })

export const cancelStaffOrderSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        'Cancellation reason is required.',
      )
      .max(
        500,
        'Cancellation reason is too long.',
      ),
  })

export type CreateCustomerOrderInput =
  z.infer<
    typeof createCustomerOrderSchema
  >

export type CreatePosOrderInput =
  CreateCustomerOrderInput

function generateOrderNo() {
  const timestamp =
    Date.now()

  const token =
    randomUUID()
      .replaceAll('-', '')
      .slice(0, 8)
      .toUpperCase()

  return `ORD-${timestamp}-${token}`
}

export async function createCustomerOrder(
  userId: number,
  input: CreateCustomerOrderInput,
) {
  /*
   * 1. Resolve authenticated user
   * into an active customer.
   */
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  /*
   * 2. Resolve BrewHub's current
   * initial branch by stable code.
   */
  const branch =
    await findActiveBranchByCode(
      'MAIN',
    )

  if (!branch) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'BrewHub branch is unavailable',
    })
  }

  /*
   * 3. Consolidate duplicate
   * product entries.
   */
  const quantities =
    new Map<number, number>()

  for (const item of input.items) {
    const currentQuantity =
      quantities.get(
        item.productId,
      ) ?? 0

    const combinedQuantity =
      currentQuantity
      + item.quantity

    if (combinedQuantity > 100) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Product quantity exceeds the allowed limit',
      })
    }

    quantities.set(
      item.productId,
      combinedQuantity,
    )
  }

  const productIds = [
    ...quantities.keys(),
  ]

  /*
   * 4. Catalog provides authoritative
   * product information and prices.
   */
  const catalogProducts =
    await getOrderableProducts(
      productIds,
    )

  if (
    catalogProducts.length
    !== productIds.length
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'One or more selected products are unavailable',
    })
  }

  const productMap =
    new Map(
      catalogProducts.map(
        product => [
          product.id,
          product,
        ],
      ),
    )

  /*
   * 5. Build immutable order-item
   * snapshots from server data.
   */
  const items =
    productIds.map(
      (productId) => {
        const product =
          productMap.get(
            productId,
          )

        if (!product) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Selected product is unavailable',
          })
        }

        const quantity =
          quantities.get(
            productId,
          )

        if (quantity === undefined) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Invalid product quantity',
          })
        }

        return {
          productId:
            product.id,

          skuSnapshot:
            product.sku,

          productNameSnapshot:
            product.name,

          quantity:
            quantity.toFixed(3),

          unitPrice:
            product.basePrice
              .toFixed(2),

          discountAmount:
            '0.00',
        }
      },
    )

  /*
   * 6. Persist order + items.
   */
  const order =
    await insertOrderWithItems({
      orderNo:
        generateOrderNo(),

      branchId:
        branch.id,

      customerId:
        customer.id,

      createdByUserId:
        userId,

      source:
        'CUSTOMER',

      orderType:
        input.orderType,

      items,
    })

  return normalizeOrder(
    order,
  )
}

export async function createPosOrder(
  userId: number,
  input: CreatePosOrderInput,
) {
  /*
   * 1. Resolve BrewHub's active
   * initial branch.
   */
  const branch =
    await findActiveBranchByCode(
      'MAIN',
    )

  if (!branch) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'BrewHub branch is unavailable',
    })
  }

  /*
   * 2. Consolidate duplicate
   * product entries.
   */
  const quantities =
    new Map<number, number>()

  for (const item of input.items) {
    const currentQuantity =
      quantities.get(
        item.productId,
      ) ?? 0

    const combinedQuantity =
      currentQuantity
      + item.quantity

    if (combinedQuantity > 100) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Product quantity exceeds the allowed limit',
      })
    }

    quantities.set(
      item.productId,
      combinedQuantity,
    )
  }

  const productIds = [
    ...quantities.keys(),
  ]

  /*
   * 3. Catalog remains authoritative
   * for current products and prices.
   *
   * Never trust POS browser prices.
   */
  const catalogProducts =
    await getOrderableProducts(
      productIds,
    )

  if (
    catalogProducts.length
    !== productIds.length
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'One or more selected products are unavailable',
    })
  }

  const productMap =
    new Map(
      catalogProducts.map(
        product => [
          product.id,
          product,
        ],
      ),
    )

  /*
   * 4. Build immutable order-item
   * snapshots from server data.
   */
  const items =
    productIds.map(
      (productId) => {
        const product =
          productMap.get(
            productId,
          )

        if (!product) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Selected product is unavailable',
          })
        }

        const quantity =
          quantities.get(
            productId,
          )

        if (
          quantity === undefined
        ) {
          throw createError({
            statusCode: 400,
            statusMessage:
              'Invalid product quantity',
          })
        }

        return {
          productId:
            product.id,

          skuSnapshot:
            product.sku,

          productNameSnapshot:
            product.name,

          quantity:
            quantity.toFixed(3),

          unitPrice:
            product.basePrice
              .toFixed(2),

          discountAmount:
            '0.00',
        }
      },
    )

  /*
   * 5. Persist the POS order.
   *
   * POS orders do not require a
   * customer account.
   */
  const order =
    await insertOrderWithItems({
      orderNo:
        generateOrderNo(),

      branchId:
        branch.id,

      customerId:
        null,

      createdByUserId:
        userId,

      source:
        'POS',

      orderType:
        input.orderType,

      items,
    })

  return normalizeOrder(
    order,
  )
}

export async function prepareCustomerOrderForPayment(
  userId: number,
  orderId: number,
) {
  /*
   * 1. Resolve logged-in user
   * into an active customer.
   */
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  /*
   * 2. Load the order and confirm
   * that the customer owns it.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (
    !order
    || order.customerId !== customer.id
  ) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  /*
   * If this order was already prepared,
   * return it without reserving again.
   */
  if (
    order.status === 'PENDING_PAYMENT'
  ) {
    return normalizeOrder(
      order,
    )
  }

  /*
   * Only DRAFT orders can begin
   * payment preparation.
   */
  if (
    order.status !== 'DRAFT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order cannot be prepared for payment',
    })
  }

  /*
   * 3. Load order items.
   */
  const items =
    await findOrderItemsByOrderId(
      order.id,
    )

  if (items.length === 0) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order has no items',
    })
  }

  /*
   * 4. Get current Catalog information
   * for the products in the order.
   */
  const productIds = [
    ...new Set(
      items.map(
        item => item.productId,
      ),
    ),
  ]

  const products =
    await getOrderableProducts(
      productIds,
    )

  if (
    products.length
    !== productIds.length
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'One or more order products are no longer available',
    })
  }

  const productMap =
    new Map(
      products.map(
        product => [
          product.id,
          product,
        ],
      ),
    )

  /*
   * All inventory movements from
   * this attempt share one trace ID.
   */

  const traceId =
  randomUUID()

  const reservationExpiresAt =
  new Date(
    Date.now()
      + 15 * 60 * 1000,
  )

  const reservationIds: number[] =
    []

  try {
    /*
     * 5. Reserve every inventory-tracked
     * product in the order.
     */
    for (const item of items) {
      const product =
        productMap.get(
          item.productId,
        )

      if (!product) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'Order product is unavailable',
        })
      }

      /*
       * Non-inventory products do not
       * require reservations.
       */
      if (!product.trackInventory) {
        continue
      }

      const quantity =
        Number(
          item.quantity,
        )

      if (
        !Number.isFinite(quantity)
        || quantity <= 0
      ) {
        throw createError({
          statusCode: 500,
          statusMessage:
            'Order contains an invalid quantity',
        })
      }

      const { reservationId } =
        await reserveStockForOrder({
          orderId:
            order.id,

          productId:
            item.productId,

          quantity,

          expiresAt:
            reservationExpiresAt,

          userId,

          traceId,
        })

      reservationIds.push(
        reservationId,
      )
    }

    /*
     * 6. Every reservation succeeded,
     * so move the order:
     *
     * DRAFT -> PENDING_PAYMENT
     */
    const transition =
      await transitionOrderStatus(
        order.id,
        'DRAFT',
        'PENDING_PAYMENT',
        order.version,
      )

    if (!transition) {
      /*
       * Another request may have already
       * prepared this same order.
       */
      const currentOrder =
        await findOrderById(
          order.id,
        )

      if (
        currentOrder?.status
        === 'PENDING_PAYMENT'
      ) {

        return normalizeOrder(
          currentOrder,
        )
      }

      throw createError({
        statusCode: 409,
        statusMessage:
          'Order changed while preparing payment',
      })
    }

    /*
     * Reload the complete order after
     * changing its status.
     */
    const updatedOrder =
      await findOrderById(
        order.id,
      )

    if (!updatedOrder) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'Unable to reload prepared order',
      })
    }

    return normalizeOrder(
      updatedOrder,
    )
  }
  catch (error) {
    /*
     * Compensation:
     *
     * If an earlier product was reserved
     * but a later reservation fails,
     * release the successful reservations.
     */
    for (
      const reservationId
      of [...reservationIds].reverse()
    ) {
      try {
        await releaseStockReservation({
          reservationId,

          reason:
            'Order payment preparation failed',

          userId,

          traceId,

          finalStatus:
            'RELEASED',
        })
      }
      catch {
        /*
         * Keep the original error.
         */
      }
    }

    throw error
  }
}

export async function preparePosOrderForPayment(
  userId: number,
  orderId: number,
) {
  /*
   * 1. Load the POS order.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'POS order not found',
    })
  }

  /*
   * This workflow is specifically
   * for staff-created POS orders.
   */
  if (order.source !== 'POS') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order is not a POS order',
    })
  }

  /*
   * Already prepared:
   * return safely without reserving twice.
   */
  if (
    order.status === 'PENDING_PAYMENT'
  ) {
    return normalizeOrder(
      order,
    )
  }

  /*
   * Only DRAFT POS orders may begin
   * payment preparation.
   */
  if (
    order.status !== 'DRAFT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order cannot be prepared for payment',
    })
  }

  /*
   * 2. Load the order items.
   */
  const items =
    await findOrderItemsByOrderId(
      order.id,
    )

  if (items.length === 0) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order has no items',
    })
  }

  /*
   * 3. Read current Catalog information
   * so inventory tracking rules remain
   * authoritative on the server.
   */
  const productIds = [
    ...new Set(
      items.map(
        item => item.productId,
      ),
    ),
  ]

  const products =
    await getOrderableProducts(
      productIds,
    )

  if (
    products.length
    !== productIds.length
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'One or more POS products are no longer available',
    })
  }

  const productMap =
    new Map(
      products.map(
        product => [
          product.id,
          product,
        ],
      ),
    )

  const traceId =
    randomUUID()

  const reservationStartedAtMs =
  Date.now()

  /*
   * POS reservations use the same
   * 15-minute timeout policy.
   */
  const reservationExpiresAt =
    new Date(
      Date.now()
        + 15 * 60 * 1000,
    )

  const reservationIds: number[] =
    []

  try {
    /*
     * 4. Reserve inventory-tracked
     * products.
     */
    for (const item of items) {
      const product =
        productMap.get(
          item.productId,
        )

      if (!product) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'POS product is unavailable',
        })
      }

      if (!product.trackInventory) {
        continue
      }

      const quantity =
        Number(
          item.quantity,
        )

      if (
        !Number.isFinite(quantity)
        || quantity <= 0
      ) {
        throw createError({
          statusCode: 500,
          statusMessage:
            'POS order contains an invalid quantity',
        })
      }

      const { reservationId } =
        await reserveStockForOrder({
          orderId:
            order.id,

          productId:
            item.productId,

          quantity,

          expiresAt:
            reservationExpiresAt,

          userId,

          traceId,
        })

      reservationIds.push(
        reservationId,
      )
    }

    /*
     * 5. All reservations succeeded.
     *
     * DRAFT -> PENDING_PAYMENT
     */
    const transition =
      await transitionOrderStatus(
        order.id,
        'DRAFT',
        'PENDING_PAYMENT',
        order.version,
      )

    if (!transition) {
      const currentOrder =
        await findOrderById(
          order.id,
        )

      if (
        currentOrder?.status
        === 'PENDING_PAYMENT'
      ) {

        logInfo(
          'inventory.reserve',
          {
            traceId,
          
            userId,
          
            branchId:
              order.branchId,
          
            orderId:
              order.id,
          
            reservationCount:
              reservationIds.length,
          
            durationMs:
              Date.now()
              - reservationStartedAtMs,
          
            result:
              'success',
          
            source:
              'POS',
          },
        )

        return normalizeOrder(
          currentOrder,
        )
      }

      throw createError({
        statusCode: 409,
        statusMessage:
          'POS order changed while preparing payment',
      })
    }

    const updatedOrder =
      await findOrderById(
        order.id,
      )

    if (!updatedOrder) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'Unable to reload prepared POS order',
      })
    }

    logInfo(
      'inventory.reserve',
      {
        traceId,
      
        userId,
      
        branchId:
          order.branchId,
      
        orderId:
          order.id,
      
        reservationCount:
          reservationIds.length,
      
        durationMs:
          Date.now()
          - reservationStartedAtMs,
      
        result:
          'success',
      
        source:
          'POS',
      },
    )

    return normalizeOrder(
      updatedOrder,
    )
  }
  catch (error) {
  /*
   * Compensation:
   * release reservations created by
   * this failed preparation attempt.
   */
  for (
    const reservationId
    of [...reservationIds].reverse()
  ) {
    try {
      await releaseStockReservation({
        reservationId,

        reason:
          'POS payment preparation failed',

        userId,

        traceId,

        finalStatus:
          'RELEASED',
      })
    }
    catch {
      /*
       * Preserve original error.
       */
          }
        }
      
        const failureMessage =
          error instanceof Error
            ? error.message
            : 'Inventory reservation failed'
      
        logWarn(
          'inventory_reservation_failed',
          {
            traceId,
          
            userId,
          
            branchId:
              order.branchId,
          
            orderId:
              order.id,
          
            reservationCount:
              reservationIds.length,
          
            durationMs:
              Date.now()
              - reservationStartedAtMs,
          
            result:
              'failed',
          
            source:
              'POS',
          
            message:
              failureMessage,
          },
        )
      
        throw error
      }
}

export async function cancelCustomerOrder(
  userId: number,
  orderId: number,
  reason: string,
) {
  /*
   * 1. Resolve logged-in user
   * into an active customer.
   */
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  /*
   * 2. Load order and verify
   * customer ownership.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (
    !order
    || order.customerId
      !== customer.id
  ) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  /*
   * Repeated cancellation is safe.
   */
  if (
    order.status === 'CANCELLED'
  ) {
    return normalizeOrder(
      order,
    )
  }

  /*
   * Customers may directly cancel only
   * before successful completion/payment.
   */
  if (
    order.status !== 'DRAFT'
    && order.status
      !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order cannot be cancelled',
    })
  }

  const trimmedReason =
    reason.trim()

  if (!trimmedReason) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Cancellation reason is required',
    })
  }

  /*
   * PostgreSQL performs the complete
   * cancellation transaction:
   *
   * - releases ACTIVE reservations
   * - marks order CANCELLED
   * - stores reason/time
   * - increments version
   * - writes audit log
   */

  const traceId =
  randomUUID()
  
  await cancelOrder(
    order.id,
    userId,
    trimmedReason,
    traceId,
  )

  /*
   * Reload the order after the
   * stored procedure completes.
   */
  const cancelledOrder =
    await findOrderById(
      order.id,
    )

  if (!cancelledOrder) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to reload cancelled order',
    })
  }

  if (
    cancelledOrder.status
    !== 'CANCELLED'
  ) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Order cancellation did not finish',
    })
  }

  return normalizeOrder(
    cancelledOrder,
  )
}

export async function cancelStaffOrder(
  userId: number,
  orderId: number,
  reason: string,
  traceId: string,
) {
  if (
    !Number.isInteger(userId)
    || userId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid user ID',
    })
  }

  if (
    !Number.isInteger(orderId)
    || orderId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid order ID',
    })
  }

  const parsed =
    cancelStaffOrderSchema.safeParse({
      reason,
    })

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid cancellation data',
      data:
        parsed.error.flatten(),
    })
  }

  const order =
    await findOrderById(
      orderId,
    )

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  /*
   * Repeated cancellation remains
   * safe and idempotent.
   */
  if (
    order.status === 'CANCELLED'
  ) {
    return normalizeOrder(
      order,
    )
  }

  /*
   * Staff may cancel an order only
   * before successful payment/completion.
   */
  if (
    order.status !== 'DRAFT'
    && order.status
      !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order cannot be cancelled',
    })
  }

  await cancelOrder(
    order.id,
    userId,
    parsed.data.reason,
    traceId,
  )

  const cancelledOrder =
    await findOrderById(
      order.id,
    )

  if (!cancelledOrder) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to reload cancelled order',
    })
  }

  if (
    cancelledOrder.status
    !== 'CANCELLED'
  ) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Order cancellation did not finish',
    })
  }

  return normalizeOrder(
    cancelledOrder,
  )
}

export async function getRecentStaffOrders(
  limit = 50,
) {
  const rows =
    await findRecentOrders(
      limit,
    )

  return rows.map(
    normalizeOrder,
  )
}

export async function getStaffOrderDetails(
  orderId: number,
) {
  if (
    !Number.isInteger(orderId)
    || orderId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid order ID',
    })
  }

  const order =
    await findOrderById(
      orderId,
    )

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  const [
    items,
    payments,
    reservations,
    stockMovements,
  ] =
    await Promise.all([
      findOrderItemsByOrderId(
        order.id,
      ),

      getPaymentsByOrder(
        order.id,
      ),

      getOrderReservations(
        order.id,
      ),

      getStockMovementHistory({
        branchId:
          order.branchId,

        orderId:
          order.id,

        limit: 100,
      }),
    ])

  return {
    order:
      normalizeOrder(
        order,
      ),

    items:
      items.map(
        item => ({
          ...item,

          quantity:
            Number(
              item.quantity,
            ),

          unitPrice:
            Number(
              item.unitPrice,
            ),

          discountAmount:
            Number(
              item.discountAmount,
            ),

          lineTotal:
            Number(
              item.lineTotal,
            ),
        }),
      ),

    payments,

    reservations,

    stockMovements,
  }
}

export async function getCustomerOrders(
  userId: number,
) {
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  const rows =
    await findOrdersByCustomerId(
      customer.id,
    )

  return rows.map(
    normalizeOrder,
  )
}

export async function getCustomerOrder(
  userId: number,
  orderId: number,
) {
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  const order =
    await findOrderById(
      orderId,
    )

  /*
   * Don't expose whether another
   * customer's order exists.
   */
  if (
    !order
    || order.customerId
      !== customer.id
  ) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  const items =
    await findOrderItemsByOrderId(
      order.id,
    )

  return {
    ...normalizeOrder(order),

    items:
      items.map(item => ({
        ...item,

        quantity:
          Number(
            item.quantity,
          ),

        unitPrice:
          Number(
            item.unitPrice,
          ),

        discountAmount:
          Number(
            item.discountAmount,
          ),

        lineTotal:
          Number(
            item.lineTotal,
          ),
      })),
  }
}

function normalizeOrder<
  T extends {
    subtotal: string | number
    discountAmount: string | number
    taxAmount: string | number
    totalAmount:
      string | number | null
  },
>(
  order: T,
) {
  return {
    ...order,

    subtotal:
      Number(
        order.subtotal,
      ),

    discountAmount:
      Number(
        order.discountAmount,
      ),

    taxAmount:
      Number(
        order.taxAmount,
      ),

    totalAmount:
      Number(
        order.totalAmount ?? 0,
      ),
  }
}