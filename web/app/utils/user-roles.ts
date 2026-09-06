function hasRoles(
  value: unknown,
): value is {
  roles?: unknown
} {
  return (
    typeof value === 'object'
    && value !== null
  )
}

export function getUserRoles(
  user: unknown,
): string[] {
  if (!hasRoles(user)) {
    return []
  }

  if (!Array.isArray(user.roles)) {
    return []
  }

  return user.roles.filter(
    (role): role is string =>
      typeof role === 'string',
  )
}