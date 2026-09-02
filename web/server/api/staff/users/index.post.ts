import {
  registerStaffSchema,
  registerStaffUser,
} from '#server/domains/authentication/staff-registration'
import {
  requireRole,
} from '#server/domains/authentication/authorization'

export default defineEventHandler(async (event) => {
  const manager = await requireRole(
    event,
    'MANAGER',
  )

  const body = await readBody(event)

  const parsed = registerStaffSchema.safeParse(
    body,
  )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid staff account data',
      data: parsed.error.flatten(),
    })
  }

  const user = await registerStaffUser(
    parsed.data,
  )

  return {
    message: 'Staff account created',
    user,
    createdBy: {
      id: manager.id,
      username: manager.username,
    },
  }
})