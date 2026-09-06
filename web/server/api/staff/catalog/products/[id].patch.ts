import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  editManagedProduct,
  updateManagedProductSchema,
} from '#server/domains/catalog/management-service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    const manager =
      await requireRole(
        event,
        'MANAGER',
      )

    const requestContext =
      getBrewHubRequestContext(
        event,
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

    const body =
      await readBody(event)

    const parsed =
      updateManagedProductSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid product changes',
        data:
          parsed.error.flatten(),
      })
    }

    const product =
  await editManagedProduct(
    productId,
    parsed.data,
    {
      actorUserId:
        manager.id,

      reason:
        parsed.data.reason
        ?? '',

      traceId:
        requestContext.traceId,
    },
  )

    return {
      message:
        'Product updated successfully',
      product,

      updatedBy: {
        id: manager.id,
        username:
          manager.username,
      },
    }
  },
)
