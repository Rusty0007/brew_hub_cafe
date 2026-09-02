import {
  createAuthSession,
} from '#server/domains/authentication/session'

import {
  registerCustomer,
  registerCustomerSchema,
} from '#server/domains/customer/service'

export default defineEventHandler(
  async (event) => {
    const body =
      await readBody(event)

    const parsed =
      registerCustomerSchema.safeParse(
        body,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid registration data',
        data:
          parsed.error.flatten(),
      })
    }

    const account =
      await registerCustomer(
        parsed.data,
      )

    await createAuthSession(
      event,
      account.user.id,
    )

    return {
      message:
        'Account created successfully',

      user: account.user,

      customer:
        account.customer,
    }
  },
)