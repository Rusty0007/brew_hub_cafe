import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  createStaffUser,
  createStaffUserSchema,
} from '#server/domains/authentication/admin-user-service'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(
    event,
    'ADMIN',
  )

  const body = await readBody(event)

  const parsed = createStaffUserSchema.safeParse(
    body,
  )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid staff account data',
      data: parsed.error.flatten(),
    })
  }

  const user = await createStaffUser(
    parsed.data,
  )

  return {
    message: 'Staff account created',
    user,
    createdBy: {
      id: admin.id,
      username: admin.username,
    },
  }
})