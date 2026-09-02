import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  getCustomerOrder,
  prepareCustomerOrderForPayment,
} from '#server/domains/ordering/service'

import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

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
          'Invalid order ID',
      })
    }

    updateBrewHubRequestContext(
      event,
      {
        orderId,
      },
    )

    const observedOrder =
      await getCustomerOrder(
        user.id,
        orderId,
      )
    
    updateBrewHubRequestContext(
      event,
      {
        branchId:
          observedOrder.branchId,
      },
    )

    
    const reservationStartedAtMs =
    Date.now()

    try {
      const order =
        await prepareCustomerOrderForPayment(
          user.id,
          orderId,
        )
      
      const requestContext =
        getBrewHubRequestContext(
          event,
        )
      
      logInfo(
        'inventory.reserve',
        {
          requestId:
            requestContext.requestId,
        
          traceId:
            requestContext.traceId,
        
          userId:
            user.id,
        
          branchId:
            observedOrder.branchId,
        
          orderId,
        
          durationMs:
            Date.now()
            - reservationStartedAtMs,
        
          result:
            'success',
        },
      )
    
      return {
        message:
          'Order prepared for payment',
        order,
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
          
      const failureMessage =
        (
          typeof error === 'object'
          && error !== null
          && 'statusMessage' in error
          && typeof (
            error as {
              statusMessage?: unknown
            }
          ).statusMessage === 'string'
        )
          ? (
              error as {
                statusMessage: string
              }
            ).statusMessage
          : 'Inventory reservation failed'
          
      logWarn(
        'inventory_reservation_failed',
        {
          requestId:
            requestContext.requestId,
        
          traceId:
            requestContext.traceId,
        
          userId:
            user.id,
        
          branchId:
            observedOrder.branchId,
        
          orderId,
        
          statusCode:
            Number.isInteger(statusCode)
              ? statusCode
              : 500,
        
          durationMs:
            Date.now()
            - reservationStartedAtMs,
        
          result:
            'failed',
        
          message:
            failureMessage,
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
          user.id,
            
        branchId:
          observedOrder.branchId,
            
        orderId,
            
        source:
          'CUSTOMER',
            
        result:
          'failed',
            
        metadata: {
          stage:
            'inventory.reserve',
        
          statusCode:
            Number.isInteger(
              statusCode,
            )
              ? statusCode
              : 500,
          
          message:
            failureMessage,
        },
      })
    
      throw error
    }
      },
    )