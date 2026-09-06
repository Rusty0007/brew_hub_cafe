import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  auditLogs,
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

export const updateStaffUserRoleSchema =
  z.object({
    role: z.enum([
      'MANAGER',
      'CASHIER',
    ]),

    reason: z
      .string()
      .trim()
      .min(
        3,
        'Role change reason is required.',
      )
      .max(500),
  })

export type UpdateStaffUserRoleInput =
  z.infer<
    typeof updateStaffUserRoleSchema
  >

interface UpdateStaffUserRoleAuditContext {
  actorUserId: number
  traceId?: string | null
}

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

export async function updateStaffUserRole(
  userId: number,
  input: UpdateStaffUserRoleInput,
  auditContext: UpdateStaffUserRoleAuditContext,
) {
  const db = useDb()

  return await db.transaction(
    async (tx) => {
      const targetUsers =
        await tx
          .select({
            id: users.id,
            username:
              users.username,
            displayName:
              users.displayName,
            email:
              users.email,
            isActive:
              users.isActive,
          })
          .from(users)
          .where(
            eq(
              users.id,
              userId,
            ),
          )
          .limit(1)

      const targetUser =
        targetUsers[0]

      if (!targetUser) {
        throw createError({
          statusCode: 404,
          statusMessage:
            'Staff user not found',
        })
      }

      const currentRoles =
        await tx
          .select({
            id: roles.id,
            code: roles.code,
          })
          .from(userRoles)
          .innerJoin(
            roles,
            eq(
              userRoles.roleId,
              roles.id,
            ),
          )
          .where(
            eq(
              userRoles.userId,
              userId,
            ),
          )

      if (
        currentRoles.length
        !== 1
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'User must have exactly one staff role',
        })
      }

      const currentRole =
        currentRoles[0]!

      if (
        currentRole.code
          !== 'CASHIER'
        && currentRole.code
          !== 'MANAGER'
      ) {
        throw createError({
          statusCode: 403,
          statusMessage:
            'This user role cannot be changed',
        })
      }

      if (
        currentRole.code
        === input.role
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'User already has this role',
        })
      }

      const selectedRoles =
        await tx
          .select({
            id: roles.id,
            code: roles.code,
          })
          .from(roles)
          .where(
            eq(
              roles.code,
              input.role,
            ),
          )
          .limit(1)

      const selectedRole =
        selectedRoles[0]

      if (!selectedRole) {
        throw createError({
          statusCode: 500,
          statusMessage:
            'Selected role is not configured',
        })
      }

      const updatedRoles =
        await tx
          .update(userRoles)
          .set({
            roleId:
              selectedRole.id,
          })
          .where(
            and(
              eq(
                userRoles.userId,
                userId,
              ),
              eq(
                userRoles.roleId,
                currentRole.id,
              ),
            ),
          )
          .returning({
            userId:
              userRoles.userId,
          })

      if (
        updatedRoles.length
        !== 1
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'User role changed concurrently',
        })
      }

      await tx
        .insert(auditLogs)
        .values({
          actorUserId:
            auditContext.actorUserId,

          branchId:
            null,

          action:
            'user.role_change',

          resourceType:
            'user',

          resourceId:
            String(userId),

          beforeData: {
            role:
              currentRole.code,
          },

          afterData: {
            role:
              selectedRole.code,
          },

          reason:
            input.reason.trim(),

          traceId:
            auditContext.traceId
            ?? null,
        })

      return {
        ...targetUser,

        roles: [
          selectedRole.code,
        ],
      }
    },
  )
}