export const ALERT_IDS = [
  'checkout.failure_rate',
  'database.critical_query',
  'payment.timeout_increase',
  'inventory.negative_stock_attempt',
  'security.repeated_login_failure',
] as const

export type AlertId =
  typeof ALERT_IDS[number]

export type AlertStatus =
  | 'OK'
  | 'ACTIVE'

export type AlertSeverity =
  | 'WARNING'
  | 'CRITICAL'

export interface AlertEvaluation {
  id: AlertId

  name: string

  status: AlertStatus

  severity: AlertSeverity

  condition: string

  evidence: Record<
    string,
    unknown
  >

  investigationSteps:
    readonly string[]
}

export const ALERT_THRESHOLDS = {
  'checkout.failure_rate': {
    failureRatePercent:
      5,

    consecutiveMinutes:
      5,
  },

  'database.critical_query': {
    durationMs:
      500,

      windowMinutes:
        5,
  },

  /*
   * BrewHub anomaly rule:
   *
   * At least 3 payment timeouts
   * during the current 5-minute
   * window AND at least twice the
   * previous 5-minute window.
   */
  'payment.timeout_increase': {
    windowMinutes:
      5,

    minimumCurrentCount:
      3,

    increaseMultiplier:
      2,
  },

  'inventory.negative_stock_attempt': {
    minimumCount:
      1,
  },

  /*
   * BrewHub security rule:
   *
   * Five failed authentication
   * attempts from the same account
   * or source within five minutes.
   */
  'security.repeated_login_failure': {
    failureCount:
      5,

    windowMinutes:
      5,
  },
} as const