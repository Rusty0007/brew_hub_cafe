import { z } from 'zod'

import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getStaffOrderDetails,
} from '#server/domains/ordering/service'

import {
  refundOrderPayment,
} from '#server/domains/payment/service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

const refundOrderSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        3,
        'Refund reason is required',
      )
      .max(500),
  })

export default defineEventHandler(
  async (event) => {
    const manager =
      await requireAnyRole(
    event,
    [
      'MANAGER',
    ],
  )

    const requestContext =
      getBrewHubRequestContext(
      event,
  )

    const rawOrderId =
      getRouterParam(
        event,
        'id',
      )

    const orderId =
      Number(
        rawOrderId,
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

    const body =
  await readBody(event)

  const parsed =
    refundOrderSchema.safeParse(
      body,
    )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid refund request',
      data:
        parsed.error.flatten(),
    })
  }

    const details =
      await getStaffOrderDetails(
        orderId,
      )

    /*
     * An ordinary refund is only
     * available after the sale has
     * completed successfully.
     */
    if (
      details.order.status
        !== 'COMPLETED'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Only completed orders can be refunded',
      })
    }

    const refund =
  await refundOrderPayment(
    orderId,
    {
      actorUserId:
        manager.id,

      branchId:
        details.order.branchId,

      /*
       * Temporary Task 13 reason.
       *
       * F4/F5 will replace this with
       * a manager-provided refund reason.
       */
      reason:
        parsed.data.reason,

      traceId:
        requestContext.traceId,
    },
  )

    return {
      message:
        'Order payment refunded successfully',

      refund,
    }
  },
)