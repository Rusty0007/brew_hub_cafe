import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  createCustomerOrder,
  createCustomerOrderSchema,
} from '#server/domains/ordering/service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import { logInfo } from '#server/utils/logger'

import {
  recordCheckoutStage,
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

export default defineEventHandler(
  async (event) => {

    const user =
      await requireUser(event)

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
          user.id,

        method:
          'POST',

        path:
          '/api/customer/orders',

        result:
          'started',
      },
    )

    await recordTelemetryEvent({
      eventName:
        'checkout.start',

      requestId:
        checkoutContext.requestId,

      traceId:
        checkoutContext.traceId,

      userId:
        user.id,

      source:
        'CUSTOMER',

      result:
        'started',

      metadata: {
        method:
          'POST',

        path:
          '/api/customer/orders',
      },
    })

    const orderCreateStartedAtMs =
      Date.now()

    const body =
      await readBody(event)

    const parsed =
      createCustomerOrderSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid order data',
        data:
          parsed.error.flatten(),
      })
    }

    const orderCreatePerformanceTimer =
      startPerformanceTimer()

    const order =
      await createCustomerOrder(
        user.id,
        parsed.data,
      )

    const orderCreateDurationMs =
      orderCreatePerformanceTimer
      .elapsedMs()


    updateBrewHubRequestContext(
        event,
        {
          orderId:
            order.id,

          branchId:
            order.branchId,
        },
      )

      const orderContext =
        getBrewHubRequestContext(
          event,
        )

      await recordCheckoutStage({
        stage:
          'order.create',

        durationMs:
          orderCreateDurationMs,

        requestId:
          orderContext.requestId,

        traceId:
          orderContext.traceId,

        userId:
          user.id,

        branchId:
          order.branchId,

        orderId:
          order.id,

        source:
          'CUSTOMER',

        orderType:
          parsed.data.orderType,

        result:
          'success',

        metadata: {
          itemCount:
            parsed.data.items.length,
        },
      })

      logInfo(
        'order.create',
        {
          requestId:
            orderContext.requestId,

          traceId:
            orderContext.traceId,

          userId:
            user.id,

          branchId:
            order.branchId,

          orderId:
            order.id,

          durationMs:
            Date.now()
            - orderCreateStartedAtMs,

          result:
            'success',
        },
      )

    setResponseStatus(
      event,
      201,
    )

    return {
      message:
        'Order created successfully',
      order,
    }
  },
)
