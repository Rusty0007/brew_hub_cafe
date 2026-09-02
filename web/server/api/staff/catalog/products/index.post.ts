import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  createManagedProduct,
  createManagedProductSchema,
} from '#server/domains/catalog/management-service'

export default defineEventHandler(
  async (event) => {
    const manager =
      await requireRole(
        event,
        'MANAGER',
      )

    const body =
      await readBody(event)

    const parsed =
      createManagedProductSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid product data',
        data:
          parsed.error.flatten(),
      })
    }

    const product =
      await createManagedProduct(
        parsed.data,
      )

    return {
      message:
        'Product created successfully',

      product,

      createdBy: {
        id: manager.id,
        username:
          manager.username,
      },
    }
  },
)