import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  cancelStaffOrder,
  cancelStaffOrderSchema,
} from '#server/domains/ordering/service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    const user =
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

    updateBrewHubRequestContext(
      event,
      {
        orderId,
      },
    )

    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    const body =
      await readBody(
        event,
      )

    const parsed =
      cancelStaffOrderSchema.safeParse(
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
      await cancelStaffOrder(
        user.id,
        orderId,
        parsed.data.reason,
        requestContext.traceId,
      )

    updateBrewHubRequestContext(
      event,
      {
        branchId:
          order.branchId,
      },
    )

    return {
      message:
        'Order cancelled successfully',

      order,
    }
  },
)