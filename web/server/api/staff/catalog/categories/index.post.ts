import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  createCategorySchema,
  createManagedCategory,
} from '#server/domains/catalog/category-management-service'

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
      createCategorySchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid category data',
        data:
          parsed.error.flatten(),
      })
    }

    const category =
      await createManagedCategory(
        parsed.data,
      )

    return {
      message:
        'Category created successfully',

      category,

      createdBy: {
        id: manager.id,
        username:
          manager.username,
      },
    }
  },
)