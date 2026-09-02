import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  roles,
  userRoles,
  users,
} from '#server/db/schema'
import { useDb } from '#server/utils/db'

export const createStaffUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must contain at least 3 characters.')
    .max(80)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'Username may only contain letters, numbers, dots, underscores, and hyphens.',
    ),

  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(120),

  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),

  password: z
    .string()
    .min(12, 'Password must contain at least 12 characters.')
    .max(128),

  role: z.enum([
    'MANAGER',
    'CASHIER',
  ]),
})

export type CreateStaffUserInput =
  z.infer<typeof createStaffUserSchema>

export async function createStaffUser(
  input: CreateStaffUserInput,
) {
  const db = useDb()

  const existingUsername = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      sql`
        lower(${users.username})
        = lower(${input.username})
      `,
    )
    .limit(1)

  if (existingUsername.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Username already exists',
    })
  }

  if (input.email) {
    const existingEmail = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        sql`
          lower(${users.email})
          = lower(${input.email})
        `,
      )
      .limit(1)

    if (existingEmail.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email already exists',
      })
    }
  }

  const roleRows = await db
    .select({
      id: roles.id,
      code: roles.code,
    })
    .from(roles)
    .where(
      eq(roles.code, input.role),
    )
    .limit(1)

  const selectedRole = roleRows[0]

  if (!selectedRole) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Selected role is not configured',
    })
  }

  const passwordHash = await hashPassword(
    input.password,
  )

  return db.transaction(async (tx) => {
    const createdUsers = await tx
      .insert(users)
      .values({
        username: input.username,
        displayName: input.displayName,
        email: input.email || null,
        passwordHash,
        isActive: true,
      })
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        isActive: users.isActive,
      })

    const user = createdUsers[0]

    if (!user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to create staff account',
      })
    }

    await tx
      .insert(userRoles)
      .values({
        userId: user.id,
        roleId: selectedRole.id,
      })

    return {
      ...user,
      roles: [
        selectedRole.code,
      ],
    }
  })
}