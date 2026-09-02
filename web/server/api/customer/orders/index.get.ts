import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  getCustomerOrders,
} from '#server/domains/ordering/service'

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

    const orders =
      await getCustomerOrders(
        user.id,
      )

    return {
      orders,
    }
  },
)