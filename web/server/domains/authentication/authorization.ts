import {
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

import { hasPermission, type Permission } from './permissions'
import { requireUser } from './session'
import type { staffRole, } from './types'
import type { H3Event } from 'h3'

async function recordAuthorizationDenied(
  event: H3Event,
  metadata: Record<
    string,
    unknown
  >,
) {
  const requestContext =
    getBrewHubRequestContext(
      event,
    )

  await recordTelemetryEvent({
    eventName:
      'security.authorization.denied',

    requestId:
      requestContext.requestId,

    traceId:
      requestContext.traceId,

    userId:
      requestContext.userId,

    result:
      'denied',

    metadata,
  })
}

export function requirePermissionForRole(role: staffRole, permission: Permission) {
    if (!hasPermission(role, permission)) {
        throw createError({statusCode: 403, statusMessage: 'Forbidden',})
    }
}

export async function requirePermission(event: H3Event, permission: Permission) {
    const user = await requireUser(event)

    const allowed = user.roles.some(role => hasPermission(role, permission)
    )

    if (!allowed) {
      await recordAuthorizationDenied(
        event,
        {
          type:
            'permission',
        
          permission,
        },
      )
  
      throw createError({
        statusCode: 403,
        statusMessage:
          'Forbidden',
      })
    }

    return user
}

export function hasRole(roles: readonly staffRole[], requiredRole: staffRole,) {
    return roles.includes(requiredRole)
}

export async function requireRole(
    event: H3Event,
    requiredRole: staffRole,
) {
    const user = await requireUser(event)

    if (
  !hasRole(
    user.roles,
    requiredRole,
  )
    ) {
      await recordAuthorizationDenied(
        event,
        {
          type:
            'role',

          requiredRole,
        },
      )

      throw createError({
        statusCode: 403,
        statusMessage:
          'Forbidden',
      })
    }
    return user
}

export async function requireAnyRole(
    event: H3Event,
    allowedRoles: readonly staffRole[],
) {
    const user = await requireUser(event)

    const allowed = allowedRoles.some(
        role => user.roles.includes(role),
    )

    if (!allowed) {
      await recordAuthorizationDenied(
        event,
        {
          type:
            'any_role',
        
          allowedRoles:
            [...allowedRoles],
        },
      )
  
      throw createError({
        statusCode: 403,
        statusMessage:
          'Forbidden',
      })
    }

    return user
}

