
import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  getManagedProduct,
} from '#server/domains/catalog/management-service'

export default defineEventHandler(
  async (event) => {
    await requireRole(
      event,
      'MANAGER',
    )

    const productId = Number(
      getRouterParam(event, 'id'),
    )

    if (
      !Number.isInteger(productId)
      || productId <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid product ID',
      })
    }

    const product =
      await getManagedProduct(
        productId,
      )

    return {
      product,
    }
  },
)