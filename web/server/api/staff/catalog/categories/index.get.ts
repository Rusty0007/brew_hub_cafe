import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  listManagedCategories,
} from '#server/domains/catalog/category-management-service'

export default defineEventHandler(
  async (event) => {
    await requireRole(
      event,
      'MANAGER',
    )

    const categories =
      await listManagedCategories()

    return {
      categories,
    }
  },
)