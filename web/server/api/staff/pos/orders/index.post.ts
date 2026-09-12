import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  createPosOrderSchema,
  createPosOrder,
} from '#server/domains/ordering/service'

import {
  recordCheckoutStage,
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  logInfo,
} from '#server/utils/logger'

export default defineEventHandler(
  async (event) => {
    /*
     * POS ordering is available to
     * Cashiers and Managers only.
     */
    const staff =
      await requireAnyRole(
        event,
        [
          'CASHIER',
          'MANAGER',
        ],
      )

    /*
     * Only users who actually have the
     * CASHIER role are stored as the
     * cashier responsible for the order.
     *
     * A Manager may use the POS, but must
     * not be misidentified as a Cashier.
     */
    const cashierUserId =
      staff.roles.includes(
        'CASHIER',
      )
        ? staff.id
        : null

    const checkoutContext =
      getBrewHubRequestContext(
        event,
      )

    logInfo(
      'checkout.start',
      {
        requestId:
          checkoutContext.requestId,

        traceId:
          checkoutContext.traceId,

        userId:
          staff.id,

        method:
          'POST',

        path:
          '/api/staff/pos/orders',

        source:
          'POS',

        result:
          'started',
      },
    )

    void recordTelemetryEvent({
      eventName:
        'checkout.start',

      requestId:
        checkoutContext.requestId,

      traceId:
        checkoutContext.traceId,

      userId:
        staff.id,

      source:
        'POS',

      result:
        'started',

      metadata: {
        method:
          'POST',

        path:
          '/api/staff/pos/orders',
      },
    })

    /*
     * Read and validate the browser
     * request.
     */
    const body =
      await readBody(event)

    const parsed =
      createPosOrderSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid POS order data',

        data:
          parsed.error.flatten(),
      })
    }

    const orderCreatePerformanceTimer =
      startPerformanceTimer()

    /*
     * The Ordering service obtains
     * authoritative product prices
     * from Catalog.
     */
    const order =
    await createPosOrder(
      staff.id,
      parsed.data,
      cashierUserId,
    )

    const orderCreateDurationMs =
      orderCreatePerformanceTimer
      .elapsedMs()

    await recordCheckoutStage({
      stage:
        'order.create',

      durationMs:
        orderCreateDurationMs,

      requestId:
        checkoutContext.requestId,

      traceId:
        checkoutContext.traceId,

      userId:
        staff.id,

      branchId:
        order.branchId,

      orderId:
        order.id,

      source:
        'POS',

      orderType:
        parsed.data.orderType,

      result:
        'success',

      metadata: {
        itemCount:
          parsed.data.items.length,
      },
    })

    return {
      message:
        'POS order created successfully',

      order,
    }
  },
)
