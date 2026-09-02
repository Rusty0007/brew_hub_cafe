import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  roles,
  userRoles,
  users,
} from '#server/db/schema'
import { useDb } from '#server/utils/db'

const bodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(80),

  displayName: z
    .string()
    .trim()
    .min(1)
    .max(120),

  email: z
    .string()
    .trim()
    .email()
    .optional(),

  password: z
    .string()
    .min(12)
    .max(128),
})

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
    })
  }

  const parsed = bodySchema.safeParse(
    await readBody(event),
  )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid manager data',
      data: parsed.error.flatten(),
    })
  }

  const {
    username,
    displayName,
    email,
    password,
  } = parsed.data

  const db = useDb()

  const managerRoleRows = await db
    .select({
      id: roles.id,
    })
    .from(roles)
    .where(eq(roles.code, 'MANAGER'))
    .limit(1)

  const managerRole = managerRoleRows[0]

  if (!managerRole) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MANAGER role is not configured',
    })
  }

  // Do not allow bootstrap if a Manager already exists.
  const existingManagers = await db
    .select({
      userId: userRoles.userId,
    })
    .from(userRoles)
    .where(eq(
      userRoles.roleId,
      managerRole.id,
    ))
    .limit(1)

  if (existingManagers.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A Manager account already exists',
    })
  }

  const existingUsername = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      sql`
        lower(${users.username})
        = lower(${username})
      `,
    )
    .limit(1)

  if (existingUsername.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Username already exists',
    })
  }

  if (email) {
    const existingEmail = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        sql`
          lower(${users.email})
          = lower(${email})
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

  const passwordHash = await hashPassword(
    password,
  )

  const user = await db.transaction(
    async (tx) => {
      const createdUsers = await tx
        .insert(users)
        .values({
          username,
          displayName,
          email: email ?? null,
          passwordHash,
          isActive: true,
        })
        .returning({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
        })

      const createdUser = createdUsers[0]

      if (!createdUser) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Unable to create Manager',
        })
      }

      await tx
        .insert(userRoles)
        .values({
          userId: createdUser.id,
          roleId: managerRole.id,
        })

      return createdUser
    },
  )

  return {
    message: 'Initial Manager created',
    user: {
      ...user,
      roles: ['MANAGER'],
    },
  }
})