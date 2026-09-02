import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  cancelCustomerOrder,
  cancelCustomerOrderSchema,
} from '#server/domains/ordering/service'

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

    const body =
      await readBody(event)

    const parsed =
      cancelCustomerOrderSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid cancellation data',
        data:
          parsed.error.flatten(),
      })
    }

    const order =
      await cancelCustomerOrder(
        user.id,
        orderId,
        parsed.data.reason,
      )

    return {
      message:
        'Order cancelled successfully',

      order,
    }
  },
)