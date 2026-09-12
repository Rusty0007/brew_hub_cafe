import {
  z,
} from 'zod'

import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  searchActiveCustomers,
} from '#server/domains/customer/repository'

const querySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(255),
})

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'CASHIER',
        'MANAGER',
      ],
    )

    const query =
      getQuery(event)

    const parsed =
      querySchema.safeParse(
        query,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid customer search',
        data:
          parsed.error.flatten(),
      })
    }

    const customers =
      await searchActiveCustomers(
        parsed.data.search,
      )

    return {
      customers,
    }
  },
)