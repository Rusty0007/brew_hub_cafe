import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getRecentStaffOrders,
} from '#server/domains/ordering/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'CASHIER',
        'MANAGER',
      ],
    )

    const query =
      getQuery(event)

    const limit =
      query.limit === undefined
        ? 50
        : Number(
            query.limit,
          )

    if (
      !Number.isInteger(limit)
      || limit < 1
      || limit > 100
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid orders limit',
      })
    }

    const orders =
      await getRecentStaffOrders(
        limit,
      )

    return {
      orders,

      meta: {
        count:
          orders.length,

        limit,
      },
    }
  },
)