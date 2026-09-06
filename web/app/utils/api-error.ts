function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object'
    && value !== null
  )
}

export function getApiErrorStatusCode(
  error: unknown,
): number | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  if (
    typeof error.statusCode
    === 'number'
  ) {
    return error.statusCode
  }

  const response =
    error.response

  if (
    isRecord(response)
    && typeof response.status
      === 'number'
  ) {
    return response.status
  }

  return undefined
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!isRecord(error)) {
    return fallback
  }

  const data =
    error.data

  if (
    isRecord(data)
    && typeof data.statusMessage
      === 'string'
  ) {
    return data.statusMessage
  }

  if (
    typeof error.statusMessage
    === 'string'
  ) {
    return error.statusMessage
  }

  return fallback
}