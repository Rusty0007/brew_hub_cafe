import {
  requireRole,
} from '#server/domains/authentication/authorization'

import {
  deleteStaffUser,
  deleteStaffUserSchema,
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

    const userId =
      Number(
        getRouterParam(
          event,
          'id',
        ),
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
      deleteStaffUserSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid account deletion request',
        data:
          parsed.error.flatten(),
      })
    }

    const user =
      await deleteStaffUser(
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
        'Staff account deleted successfully',

      user,

      deletedBy: {
        id:
          admin.id,

        username:
          admin.username,
      },
    }
  },
)