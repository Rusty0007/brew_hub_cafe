import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  listManagedProducts,
} from '#server/domains/catalog/management-service'

export default defineEventHandler(async (event) => {
  const manager = await requireRole(
    event,
    'MANAGER',
  )

  const products =
    await listManagedProducts()

  return {
    products,

    requestedBy: {
      id: manager.id,
      username: manager.username,
    },
  }
})