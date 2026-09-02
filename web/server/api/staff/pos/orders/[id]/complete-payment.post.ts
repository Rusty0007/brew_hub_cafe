import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  logInfo,
  logWarn
} from '#server/utils/logger'

import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  completePosCheckout,
  simulatePosPaymentTimeout,
} from '#server/domains/ordering/checkout-service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    const staff =
      await requireAnyRole(
        event,
        [
          'CASHIER',
          'MANAGER',
        ],
      )

    const orderId =
      Number(
        getRouterParam(
          event,
          'id',
        ),
      )

    if (
      !Number.isInteger(orderId)
      || orderId <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid POS order ID',
      })
    }

    updateBrewHubRequestContext(
      event,
      {
        orderId,
      },
    )

    const query =
      getQuery(
        event,
      )

    const simulateTimeout =
      query.simulateTimeout
      === 'true'

    const simulateFailure =
      query.simulateFailure
      === 'true'

    /*
     * TESDA development-only
     * payment-timeout simulation.
     */
    if (simulateTimeout) {
      if (
        process.env.NODE_ENV
        !== 'development'
      ) {
        throw createError({
          statusCode: 404,
          statusMessage:
            'Not found',
        })
      }

      const requestContext =
        getBrewHubRequestContext(
          event,
        )

      const result =
        await simulatePosPaymentTimeout(
          staff.id,
          orderId,
          requestContext.traceId,
        )

      updateBrewHubRequestContext(
        event,
        {
          branchId:
            result.order.branchId,
        },
      )

      setResponseStatus(
        event,
        202,
      )

      return {
        message:
          'Payment is being verified',

        result,
      }
    }

    /*
     * Normal POS cash payment.
     */
    try {
      const result =
        await completePosCheckout(
          staff.id,
          orderId,
          {
            method:
              'CASH',
          
            provider:
              'BREWHUB_POS',
          
            providerReference:
              `POS-ORDER-${orderId}`,
          
            simulateFailure,
          },
        )
      
      if (
        typeof result === 'object'
        && result !== null
        && 'order' in result
      ) {
        const requestContext =
          getBrewHubRequestContext(
            event,
          )
        
        logInfo(
          'checkout.success',
          {
            requestId:
              requestContext.requestId,
          
            traceId:
              requestContext.traceId,
          
            userId:
              staff.id,
          
            branchId:
              result.order.branchId,
          
            orderId,
          
            source:
              'POS',
          
            result:
              'success',
          },
        )
      
        await recordTelemetryEvent({
          eventName:
            'checkout.success',
        
          requestId:
            requestContext.requestId,
        
          traceId:
            requestContext.traceId,
        
          userId:
            staff.id,
        
          branchId:
            result.order.branchId,
        
          orderId,
        
          source:
            'POS',
        
          result:
            'success',
        })
      }
    
      return {
        message:
          'POS payment completed successfully',
      
        result,
      }
    }
    catch (error: unknown) {
      const requestContext =
        getBrewHubRequestContext(
          event,
        )
      
      const statusCode =
        (
          typeof error === 'object'
          && error !== null
          && 'statusCode' in error
        )
          ? Number(
              (
                error as {
                  statusCode?: unknown
                }
              ).statusCode,
            )
          : 500
          
      const message =
        error instanceof Error
          ? error.message
          : 'POS checkout failed'
          
      const isCheckoutPreconditionError =
    statusCode === 404
    || (
      statusCode === 409
      && [
        'Order is not a POS order',
        'POS order is not ready for payment',
        'POS order total is invalid',
      ].includes(
        message,
      )
    )

  if (!isCheckoutPreconditionError) {
    logWarn(
      'checkout.failure',
      {
        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        userId:
          staff.id,

        branchId:
          requestContext.branchId,

        orderId,

        statusCode:
          Number.isInteger(
            statusCode,
          )
            ? statusCode
            : 500,

        source:
          'POS',

        result:
          'failed',

        message,
      },
    )

    await recordTelemetryEvent({
      eventName:
        'checkout.failure',

      requestId:
        requestContext.requestId,

      traceId:
        requestContext.traceId,

      userId:
        staff.id,

      branchId:
        requestContext.branchId,

      orderId,

      source:
        'POS',

      result:
        'failed',

      metadata: {
        stage:
          'payment.authorize',

        statusCode:
          Number.isInteger(
            statusCode,
          )
            ? statusCode
            : 500,

        message,
      },
    })
  }

  throw error
}
 }
)