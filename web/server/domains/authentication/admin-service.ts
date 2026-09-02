import {
  findAllStaffUsers,
} from './repository'

export async function listStaffUsers() {
  const rows = await findAllStaffUsers()

  const usersById = new Map<
    number,
    {
      id: number
      username: string
      displayName: string
      email: string | null
      isActive: boolean
      lastLoginAt: string | null
      createdAt: string
      roles: string[]
    }
  >()

  for (const row of rows) {
    let user = usersById.get(row.id)

    if (!user) {
      user = {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        email: row.email,
        isActive: row.isActive,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        roles: [],
      }

      usersById.set(row.id, user)
    }

    if (row.roleCode) {
      user.roles.push(row.roleCode)
    }
  }

  return Array.from(usersById.values())
}

