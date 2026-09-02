import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  createCustomerOrderSchema,
  createPosOrder,
} from '#server/domains/ordering/service'

import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

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
      createCustomerOrderSchema.safeParse(
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

    /*
     * The Ordering service obtains
     * authoritative product prices
     * from Catalog.
     */
    const order =
      await createPosOrder(
        staff.id,
        parsed.data,
      )

    return {
      message:
        'POS order created successfully',

      order,
    }
  },
)