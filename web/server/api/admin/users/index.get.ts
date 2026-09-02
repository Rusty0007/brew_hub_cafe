import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  listStaffUsers,
} from '#server/domains/authentication/admin-service'

export default defineEventHandler(async (event) => {
  await requireRole(
    event,
    'ADMIN',
  )

  const users = await listStaffUsers()

  return {
    users,
  }
})