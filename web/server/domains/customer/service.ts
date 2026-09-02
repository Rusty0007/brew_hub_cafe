import { z } from 'zod'

import {
  findUserByEmail,
  findUserByUsername,
} from '#server/domains/authentication/repository'

import {
  findCustomerByEmail,
  findCustomerByUserId,
  insertCustomerAccount,
} from './repository'

export const registerCustomerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(
      4,
      'Username must contain at least 4 characters.',
    )
    .max(80)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'Username may only contain letters, numbers, dots, underscores, and hyphens.',
    )
    .transform(
      value => value.toLowerCase(),
    ),

  firstName: z
    .string()
    .trim()
    .min(
      1,
      'First name is required.',
    )
    .max(100),

  lastName: z
    .string()
    .trim()
    .min(
      1,
      'Last name is required.',
    )
    .max(100),

  email: z
    .string()
    .trim()
    .email(
      'Enter a valid email address.',
    )
    .max(255)
    .transform(
      value => value.toLowerCase(),
    ),

  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal('')),

  password: z
    .string()
    .min(
      8,
      'Password must contain at least 8 characters.',
    )
    .max(128),
})

export type RegisterCustomerInput =
  z.infer<
    typeof registerCustomerSchema
  >

export async function registerCustomer(
  input: RegisterCustomerInput,
) {
  const existingUsername =
    await findUserByUsername(
      input.username,
    )

  if (existingUsername) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Username is already in use',
    })
  }

  const existingUserEmail =
    await findUserByEmail(
      input.email,
    )

  if (existingUserEmail) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Email address is already registered',
    })
  }

  const existingCustomerEmail =
    await findCustomerByEmail(
      input.email,
    )

  if (existingCustomerEmail) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Email address is already registered',
    })
  }

  const passwordHash =
    await hashPassword(
      input.password,
    )

  const displayName =
    `${input.firstName} ${input.lastName}`
      .trim()

  const account =
    await insertCustomerAccount({
      username:
        input.username,

      passwordHash,

      displayName,

      email:
        input.email,

      firstName:
        input.firstName,

      lastName:
        input.lastName,

      phone:
        input.phone || null,
    })

  return {
    user: account.user,
    customer: account.customer,
  }
}

export async function getActiveCustomerByUserId(
  userId: number,
) {
  const customer =
    await findCustomerByUserId(
      userId,
    )

  if (!customer) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Customer account required',
    })
  }

  if (!customer.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Customer account is inactive',
    })
  }

  return customer
}