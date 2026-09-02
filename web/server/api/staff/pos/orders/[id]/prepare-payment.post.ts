import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  preparePosOrderForPayment,
} from '#server/domains/ordering/service'

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

    const order =
      await preparePosOrderForPayment(
        staff.id,
        orderId,
      )

    return {
      message:
        'POS order prepared for payment',

      order,
    }
  },
)