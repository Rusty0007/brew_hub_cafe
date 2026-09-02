import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  getCustomerOrder,
} from '#server/domains/ordering/service'

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

    const orderId = Number(
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

    const order =
      await getCustomerOrder(
        user.id,
        orderId,
      )

    return {
      order,
    }
  },
)