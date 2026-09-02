import {
  getInventoryByBranch,
} from '#server/domains/inventory/service'

import {
  requireUser,
} from '#server/domains/authentication/session'

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

    const roles =
      user.roles ?? []

    const canManageInventory =
      roles.includes('MANAGER')
      || roles.includes('ADMIN')

    if (!canManageInventory) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'Manager access required',
      })
    }

    const query =
      getQuery(event)

    const branchId =
      Number(query.branchId)

    if (
      !Number.isSafeInteger(branchId)
      || branchId <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'A valid branchId is required',
      })
    }

    const inventory =
      await getInventoryByBranch(
        branchId,
      )

    return {
      inventory,
    }
  },
)