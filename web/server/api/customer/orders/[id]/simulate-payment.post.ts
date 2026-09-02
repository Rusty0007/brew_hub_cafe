
import {
  getCustomerOrder,
} from '#server/domains/ordering/service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  beginIdempotentOperation,
  finishIdempotentOperation,
} from '#server/domains/idempotency/service'

import {
  completeCustomerCheckout,
} from '#server/domains/ordering/checkout-service'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

import { 
  recordTelemetryEvent
 } from '#server/domains/observability/service'

const IDEMPOTENCY_OPERATION =
  'customer.simulate-payment'

function getErrorStatusCode(
  error: unknown,
) {
  if (
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
  ) {
    const statusCode =
      Number(
        (
          error as {
            statusCode?: unknown
          }
        ).statusCode,
      )

    if (
      Number.isInteger(statusCode)
      && statusCode >= 400
      && statusCode <= 599
    ) {
      return statusCode
    }
  }

  return 500
}

function getErrorMessage(
  error: unknown,
) {
  if (
    typeof error === 'object'
    && error !== null
  ) {
    if (
      'statusMessage' in error
      && typeof (
        error as {
          statusMessage?: unknown
        }
      ).statusMessage === 'string'
    ) {
      return (
        error as {
          statusMessage: string
        }
      ).statusMessage
    }

    if (
      'message' in error
      && typeof (
        error as {
          message?: unknown
        }
      ).message === 'string'
    ) {
      return (
        error as {
          message: string
        }
      ).message
    }
  }

  return 'Checkout failed'
}

export default defineEventHandler(
  async (event) => {
    /*
     * Development-only payment simulator.
     */
    if (
      process.env.NODE_ENV
      === 'production'
    ) {
      throw createError({
        statusCode: 404,
        statusMessage:
          'Not found',
      })
    }

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

    /*
     * The client must reuse this key
     * when retrying the same request.
     */
    const idempotencyKey =
      getHeader(
        event,
        'idempotency-key',
      )

    if (!idempotencyKey) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Idempotency-Key header is required',
      })
    }

    /*
     * Everything that defines the logical
     * request belongs in the request hash.
     *
     * The method/provider are fixed because
     * this endpoint is only our local test
     * payment simulator.
     */
    const requestData = {
      userId: user.id,
      orderId,
      method: 'TEST',
      provider:
        'BREWHUB_TEST',
    }

    const idempotency =
      await beginIdempotentOperation({
        idempotencyKey,
        operation:
          IDEMPOTENCY_OPERATION,
        requestData,
        userId:
          user.id,

        branchId:
          observedOrder.branchId
      })

    /*
     * Same key, different request.
     */
    if (
      idempotency.decision
      === 'CONFLICT'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Idempotency-Key was already used for a different request',
      })
    }

    /*
     * Another request with this same
     * key is still being processed.
     */
    if (
      idempotency.decision
      === 'IN_PROGRESS'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'The original request is still processing',
      })
    }

    /*
     * The request already finished.
     * Return its stored result instead
     * of executing checkout again.
     */
    if (
      idempotency.decision
      === 'REPLAY'
    ) {
      const responseCode =
        idempotency.responseCode
        ?? (
          idempotency.storedStatus
            === 'SUCCEEDED'
            ? 200
            : 500
        )

      if (
        idempotency.storedStatus
        === 'FAILED'
      ) {
        throw createError({
          statusCode:
            responseCode,

          statusMessage:
            'Previous request failed',

          data:
            idempotency.responseBody,
        })
      }

      const replayContext =
        getBrewHubRequestContext(
          event,
        )
      
        logInfo(
          'payment.duplicate_prevented',
          {
            requestId:
              replayContext.requestId,
          
            traceId:
              replayContext.traceId,
          
            userId:
              user.id,
          
            branchId:
              observedOrder.branchId,
          
            orderId,
          
            provider:
              'BREWHUB_TEST',
          
            duplicatePrevented:
              true,
          
            detection:
              'idempotency_replay',
          },
        )

      setResponseStatus(
        event,
        responseCode,
      )

      return idempotency.responseBody
    }

    /*
     * PROCESS means this request owns
     * the right to execute checkout.
     */
    const paymentStartedAtMs =
      Date.now()
      
    const requestContext =
      getBrewHubRequestContext(
        event,
      )
    
    logInfo(
      'payment.authorize',
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
      
        paymentMethod:
          'TEST',
      
        provider:
          'BREWHUB_TEST',
      
        result:
          'started',
      },
    )
    
    try {
      const result =
        await completeCustomerCheckout(
          user.id,
          orderId,
          {
            method:
              'TEST',
          
            provider:
              'BREWHUB_TEST',
          
            providerReference:
              `TEST-ORDER-${orderId}`,
          },
        )
      
      logInfo(
        'payment.succeeded',
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
        
          paymentMethod:
            'TEST',
        
          provider:
            'BREWHUB_TEST',
        
          durationMs:
            Date.now()
            - paymentStartedAtMs,
        
          result:
            'success',
        },
      )
    
      logInfo(
        'order.completed',
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
        
          result:
            'success',
        },
      )
    
      const response = {
        message:
          'Test payment completed successfully',
      
        result,
      }
    
      /*
       * Save the successful response.
       * Future retries using the same
       * key receive this exact result.
       */
      await finishIdempotentOperation({
        idempotencyKey:
          idempotency.idempotencyKey,
      
        operation:
          IDEMPOTENCY_OPERATION,
      
        requestHash:
          idempotency.requestHash,
      
        status:
          'SUCCEEDED',
      
        resultReference:
          `ORDER-${orderId}`,
      
        responseCode:
          200,
      
        responseBody:
          response,
      })

      if (
        typeof result === 'object'
        && result !== null
        && 'order' in result
      ) {
        logInfo(
          'checkout.success',
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
          
            source:
              'CUSTOMER',
          
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
            user.id,
        
          branchId:
            observedOrder.branchId,
        
          orderId,
        
          source:
            'CUSTOMER',
        
          result:
            'success',
        })
      }
    
      return response
    }
    catch (error: unknown) {
      const statusCode =
        getErrorStatusCode(
          error,
        )

      const message =
        getErrorMessage(
          error,
        )

      logWarn(
        'payment.failed',
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
        
          paymentMethod:
            'TEST',
        
          provider:
            'BREWHUB_TEST',
        
          statusCode,
        
          durationMs:
            Date.now()
            - paymentStartedAtMs,
        
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
            'payment.authorize',
        
          statusCode,
        
          message,
        },
      })

      /*
       * Preserve the original application
       * error even if recording the failed
       * idempotency result itself fails.
       */
      try {
        await finishIdempotentOperation({
          idempotencyKey:
            idempotency.idempotencyKey,

          operation:
            IDEMPOTENCY_OPERATION,

          requestHash:
            idempotency.requestHash,

          status:
            'FAILED',

          resultReference:
            null,

          responseCode:
            statusCode,

          responseBody: {
            error: true,
            statusCode,
            message,
          },
        })
      }
      catch {
        /*
         * Keep the original checkout error.
         */
      }

      throw error
    }
  },
)