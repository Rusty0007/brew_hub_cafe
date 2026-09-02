import { z } from 'zod'

import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  getStockMovementHistory,
} from '#server/domains/inventory/service'

const querySchema = z.object({
  branchId: z.coerce
    .number()
    .int()
    .positive(),

  productId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  orderId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional(),
})

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

    const canManageInventory =
      user.roles.includes('MANAGER')
      || user.roles.includes('ADMIN')

    if (!canManageInventory) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'Manager access required',
      })
    }

    const parsed =
      querySchema.safeParse(
        getQuery(event),
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid stock movement query',
        data:
          parsed.error.flatten(),
      })
    }

    const movements =
      await getStockMovementHistory(
        parsed.data,
      )

    return {
      movements,
    }
  },
)