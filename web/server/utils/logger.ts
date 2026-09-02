export interface BrewHubLogData {
  level:
    | 'INFO'
    | 'WARN'
    | 'ERROR'

  event: string

  requestId?: string | null
  traceId?: string | null

  userId?: number | null
  branchId?: number | null
  orderId?: number | null

  method?: string | null
  path?: string | null

  statusCode?: number | null
  durationMs?: number | null

  message?: string | null

  [key: string]:
    unknown
}

const standardKeys = new Set([
  'level',
  'event',
  'requestId',
  'traceId',
  'userId',
  'branchId',
  'orderId',
  'method',
  'path',
  'statusCode',
  'durationMs',
  'message',
])

function formatValue(
  value: unknown,
) {
  if (
    typeof value === 'object'
    && value !== null
  ) {
    return JSON.stringify(value)
  }

  return String(value)
}

function createHeadline(
  data: BrewHubLogData,
) {
  switch (data.event) {
    case 'http.request.started':
      return [
        '→',
        data.method,
        data.path,
      ]
        .filter(Boolean)
        .join(' ')

    case 'http.request.completed':
      return [
        '✓',
        data.method,
        data.path,
        data.statusCode
          ? `→ ${data.statusCode}`
          : null,
        data.durationMs !== undefined
          && data.durationMs !== null
          ? `(${data.durationMs} ms)`
          : null,
      ]
        .filter(Boolean)
        .join(' ')

    case 'idempotency.request':
      return [
        '↻ IDEMPOTENCY REQUEST',
        data.decision
          ? `— ${data.decision}`
          : null,
      ]
        .filter(Boolean)
        .join(' ')

    case 'idempotency.duplicate':
      return [
        '✓ DUPLICATE PREVENTED',
        data.decision
          ? `— ${data.decision}`
          : null,
      ]
        .filter(Boolean)
        .join(' ')

    default:
      return data.event
        .replaceAll('.', ' ')
        .toUpperCase()
  }
}

function addLine(
  lines: string[],
  label: string,
  value: unknown,
) {
  if (
    value === null
    || value === undefined
    || value === ''
  ) {
    return
  }

  lines.push(
    `  ${label.padEnd(14)} ${formatValue(value)}`,
  )
}

function writeDevelopmentLog(
  data: BrewHubLogData,
) {
  const lines: string[] = []

  lines.push('')
  lines.push(
    `[${data.level}] ${createHeadline(data)}`,
  )

  if (data.message) {
    addLine(
      lines,
      'message:',
      data.message,
    )
  }

  addLine(
    lines,
    'userId:',
    data.userId,
  )

  addLine(
    lines,
    'branchId:',
    data.branchId,
  )

  addLine(
    lines,
    'orderId:',
    data.orderId,
  )

  addLine(
    lines,
    'requestId:',
    data.requestId,
  )

  addLine(
    lines,
    'traceId:',
    data.traceId,
  )

  for (
    const [key, value]
    of Object.entries(data)
  ) {
    if (standardKeys.has(key)) {
      continue
    }

    addLine(
      lines,
      `${key}:`,
      value,
    )
  }

  const output =
    lines.join('\n')

  switch (data.level) {
    case 'ERROR':
      console.error(output)
      break

    case 'WARN':
      console.warn(output)
      break

    default:
      console.info(output)
  }
}

function writeProductionLog(
  data: BrewHubLogData,
) {
  const entry = {
    timestamp:
      new Date().toISOString(),

    service:
      'brewhub-web',

    ...data,
  }

  const serialized =
    JSON.stringify(entry)

  switch (data.level) {
    case 'ERROR':
      console.error(serialized)
      break

    case 'WARN':
      console.warn(serialized)
      break

    default:
      console.info(serialized)
  }
}

function writeLog(
  data: BrewHubLogData,
) {
  if (
    process.env.NODE_ENV
    === 'production'
  ) {
    writeProductionLog(data)
    return
  }

  writeDevelopmentLog(data)
}

export function logInfo(
  event: string,
  data: Omit<
    BrewHubLogData,
    'level' | 'event'
  > = {},
) {
  writeLog({
    level:
      'INFO',

    event,

    ...data,
  })
}

export function logWarn(
  event: string,
  data: Omit<
    BrewHubLogData,
    'level' | 'event'
  > = {},
) {
  writeLog({
    level:
      'WARN',

    event,

    ...data,
  })
}

export function logError(
  event: string,
  data: Omit<
    BrewHubLogData,
    'level' | 'event'
  > = {},
) {
  writeLog({
    level:
      'ERROR',

    event,

    ...data,
  })
}