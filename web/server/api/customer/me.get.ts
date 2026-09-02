import {
  requireUser,
} from '#server/domains/authentication/session'

import {
  findCustomerByUserId,
} from '#server/domains/customer/repository'

export default defineEventHandler(
  async (event) => {
    const user =
      await requireUser(event)

    const customer =
      await findCustomerByUserId(
        user.id,
      )

    if (!customer) {
      throw createError({
        statusCode: 404,
        statusMessage:
          'Customer profile not found',
      })
    }

    if (!customer.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'Customer account is inactive',
      })
    }

    return {
      customer,
    }
  },
)