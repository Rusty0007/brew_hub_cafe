import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getStaffOrderDetails,
} from '#server/domains/ordering/service'

import {
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'CASHIER',
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

    updateBrewHubRequestContext(
      event,
      {
        orderId:
          details.order.id,
      
        branchId:
          details.order.branchId,
      },
    )

    return {
      details,
    }
  },
)