import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getStaffOrderDetails,
} from '#server/domains/ordering/service'

import {
  refundOrderPayment,
} from '#server/domains/payment/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'MANAGER',
      ],
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
      )

    return {
      message:
        'Order payment refunded successfully',

      refund,
    }
  },
)