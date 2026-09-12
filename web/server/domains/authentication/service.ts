import {
  findRolesByUserId,
  findUserByEmail,
  findUserByUsername,
  updateLastLogin,
} from './repository'

import { isStaffRole } from './types'

export async function findAuthenticationUserByUsername(
  username: string,
) {
  return findUserByUsername(
    username,
  )
}

export async function findAuthenticationUserByEmail(
  email: string,
) {
  return findUserByEmail(
    email,
  )
}

export async function authenticateUser(
  email: string,
  password: string,
) {

  const user = await findUserByEmail(
    email.trim(),
  )

  // Do not reveal whether the email exists.
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