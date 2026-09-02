import type { H3Event } from 'h3'

import {
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  findRolesByUserId,
  findUserById,
} from './repository'
import { isStaffRole } from './types'

async function loadCurrentUser(
  userId: number,
) {
  const user =
    await findUserById(userId)

  if (
    !user
    || !user.isActive
  ) {
    return null
  }

  const roleRows =
    await findRolesByUserId(
      user.id,
    )

  const roles = roleRows
    .map(role => role.code)
    .filter(isStaffRole)

  return {
    id: user.id,
    username: user.username,
    displayName:
      user.displayName,
    email: user.email,
    roles,
  }
}

export async function createAuthSession(
  event: H3Event,
  userId: number,
) {
  const user =
    await loadCurrentUser(userId)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage:
        'Unable to create session',
    })
  }

  updateBrewHubRequestContext(
    event,
    {
      userId:
        user.id,
    },
  )

  await setUserSession(
    event,
    {
      user,
    },
  )
}

export async function getSessionUserId(
  event: H3Event,
) {
  const session =
    await getUserSession(event)

  return session.user?.id
    ?? null
}

export async function getCurrentUser(
  event: H3Event,
) {
  const userId =
    await getSessionUserId(
      event,
    )

  if (!userId) {
    return null
  }

  /*
   * Reload from the database so backend
   * authorization always uses current
   * user status and current roles.
   */
  const user =
    await loadCurrentUser(
      userId,
    )

  if (!user) {
    return null
  }

  /*
   * Enrich the current HTTP request
   * with the authenticated user.
   */
  updateBrewHubRequestContext(
    event,
    {
      userId:
        user.id,
    },
  )

  return user
}

export async function requireUser(
  event: H3Event,
) {
  const user =
    await getCurrentUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage:
        'Unauthorized',
    })
  }

  return user
}

export async function clearAuthSession(
  event: H3Event,
) {
  await clearUserSession(event)
}