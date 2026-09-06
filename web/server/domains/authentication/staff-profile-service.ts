import { eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auditLogs, users, roles, userRoles } from '#server/db/schema'
import { useDb } from '#server/utils/db'

export const staffProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().email().max(255), z.literal('')]),
  reason: z.string().trim().min(3).max(500),
  updatedAt: z.string().min(1).max(64),
}).strict()

const profileFields = {
  id: users.id, username: users.username, displayName: users.displayName,
  email: users.email, isActive: users.isActive, createdAt: users.createdAt,
  updatedAt: users.updatedAt, lastLoginAt: users.lastLoginAt,
}

export async function getStaffProfile(userId: number) {
  const db = useDb()
  const [user] = await db.select(profileFields).from(users).where(eq(users.id, userId)).limit(1)
  const roleRows = await db.select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, userId))
  if (!user || !roleRows.some(role => ['MANAGER', 'CASHIER'].includes(role.code))) {
    throw createError({ statusCode: 404, statusMessage: 'Staff profile not found' })
  }
  return { ...user, roles: roleRows.map(role => role.code) }
}

export async function updateStaffProfile(userId: number, input: z.infer<typeof staffProfileUpdateSchema>, actorUserId: number, traceId?: string | null) {
  const db = useDb()
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select(profileFields).from(users).where(eq(users.id, userId)).limit(1).for('update')
      const assigned = await tx.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId)).for('update')
      const currentRoles = assigned.length ? await tx.select({ code: roles.code }).from(roles).where(inArray(roles.id, assigned.map(role => role.roleId))) : []
      if (!before || currentRoles.length !== 1 || !['MANAGER', 'CASHIER'].includes(currentRoles[0]!.code)) {
        throw createError({ statusCode: 403, statusMessage: 'Only manager and cashier profiles can be edited here' })
      }
      if (before.updatedAt !== input.updatedAt) {
        throw createError({ statusCode: 409, statusMessage: 'This profile changed. Reload it before saving.' })
      }
      const [after] = await tx.update(users).set({ displayName: input.displayName, email: input.email || null, updatedAt: sql`clock_timestamp()` }).where(eq(users.id, userId)).returning(profileFields)
      await tx.insert(auditLogs).values({
        actorUserId, action: 'user.profile_update', resourceType: 'user', resourceId: String(userId),
        beforeData: { displayName: before.displayName, email: before.email },
        afterData: { displayName: after!.displayName, email: after!.email },
        reason: input.reason, traceId: traceId ?? null,
      })
      return { ...after!, roles: currentRoles.map(role => role.code) }
    })
  }
  catch (error: unknown) {
    const cause = error as { code?: string, cause?: { code?: string } }
    if (cause.code === '23505' || cause.cause?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'That email is already used by another account' })
    }
    throw error
  }
}
