import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { requireUser } from '~~/server/domains/authentication/session'

import {
  receiveInventoryStock,
} from '#server/domains/inventory/service'

// Use the same requireUser import
// as your working inventory GET endpoint.

const bodySchema = z.object({
  branchId: z
    .number()
    .int()
    .positive(),

  productId: z
    .number()
    .int()
    .positive(),

  quantity: z
    .number()
    .finite()
    .positive(),

  reference: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),

  reason: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional(),
})

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

    const body =
      await readBody(event)

    const parsed =
      bodySchema.safeParse(body)

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid stock receipt data',
        data:
          parsed.error.flatten(),
      })
    }

    const traceId =
      randomUUID()

    const result =
      await receiveInventoryStock({
        ...parsed.data,

        userId:
          user.id,

        traceId,
      })

    setResponseStatus(
      event,
      201,
    )

    return {
      ...result,
      traceId,
    }
  },
)