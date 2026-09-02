import {
  findRolesByUserId,
  findUserByUsername,
  updateLastLogin,
} from './repository'

import { isStaffRole } from './types'

export async function authenticateUser(
  username: string,
  password: string,
) {

  const user = await findUserByUsername(
    username.trim(),
  )

  // Do not reveal whether the username exists.
  if (!user) {
    return null
  }

  // Inactive staff accounts cannot log in.
  if (!user.isActive) {
    return null
  }

  const passwordValid = await verifyPassword(
    user.passwordHash,
    password,
  )

  if (!passwordValid) {
    return null
  }

  const roleRows = await findRolesByUserId(
    user.id,
  )
  
  const roles = roleRows.map(
    role => role.code,
  ).filter(isStaffRole
    
  )

  await updateLastLogin(user.id)

  // Never return passwordHash.
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    roles,
  }
}