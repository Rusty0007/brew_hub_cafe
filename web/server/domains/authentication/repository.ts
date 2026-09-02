import { eq, sql, } from 'drizzle-orm'
import { users, roles, userRoles } from '#server/db/schema'
import { useDb } from '#server/utils/db'

export async function findUserByUsername(username: string,) {
    const db = useDb()

    const result = await db
    .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
        email: users.email,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`,

    ).limit(1)

    return result[0] ?? null
}

export async function findUserById(userId: number) {
  const db = useDb()

  const result = await db
  .select({
    id:users.id,
    username:users.username,
    displayName:users.displayName,
    email:users.email,
    isActive:users.isActive,
    lastLoginAt:users.lastLoginAt
  })
  .from(users)
  .where(
    eq(users.id, userId)
  ).limit(1)
  return result[0] ?? null
}

export async function updateLastLogin(
    userId: number,
) {
    const db = useDb()
    
    await db
    .update(users)
    .set({
        lastLoginAt: sql`now()`,
    })
    .where(
        eq(users.id, userId),
    )
}

export async function findRolesByUserId(
  userId: number,
) {
  const db = useDb()

  return db
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
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
}

export async function findAllStaffUsers() {
  const db = useDb()

  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      roleCode: roles.code,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(
      userRoles,
      eq(userRoles.userId, users.id),
    )
    .leftJoin(
      roles,
      eq(roles.id, userRoles.roleId),
    )
    .orderBy(users.id)
}

export async function findUserByEmail(
  email: string,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(
      sql`
        lower(${users.email})
        = lower(${email})
      `,
    )
    .limit(1)

  return rows[0] ?? null
}