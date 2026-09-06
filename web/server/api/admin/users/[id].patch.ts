import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  updateStaffUserRole,
  updateStaffUserRoleSchema,
} from '#server/domains/authentication/admin-user-service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    const admin =
      await requireRole(
        event,
        'ADMIN',
      )

    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    const userId = Number(
      getRouterParam(event, 'id'),
    )

    if (
      !Number.isInteger(userId)
      || userId <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid user ID',
      })
    }

    const body =
      await readBody(event)

    const parsed =
      updateStaffUserRoleSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid role change',
        data:
          parsed.error.flatten(),
      })
    }

    const user =
      await updateStaffUserRole(
        userId,
        parsed.data,
        {
          actorUserId:
            admin.id,

          traceId:
            requestContext.traceId,
        },
      )

    return {
      message:
        'User role updated successfully',

      user,

      updatedBy: {
        id:
          admin.id,

        username:
          admin.username,
      },
    }
  },
)