import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { requireUser } from '~~/server/domains/authentication/session'

import {
  adjustInventoryStock,
} from '#server/domains/inventory/service'

const bodySchema = z.object({
  branchId: z
    .number()
    .int()
    .positive(),

  productId: z
    .number()
    .int()
    .positive(),

  delta: z
    .number()
    .finite()
    .refine(
      value => value !== 0,
      {
        message:
          'Adjustment must be non-zero',
      },
    ),

  reason: z
    .string()
    .trim()
    .min(
      1,
      'Adjustment reason is required',
    )
    .max(500),
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
          'Invalid stock adjustment data',
        data:
          parsed.error.flatten(),
      })
    }

    const traceId =
      randomUUID()

    const result =
      await adjustInventoryStock({
        ...parsed.data,
        userId: user.id,
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