export const PAYMENT_TRANSACTION_TYPES = [
  'PAYMENT',
  'REFUND',
] as const

export type PaymentTransactionType =
  typeof PAYMENT_TRANSACTION_TYPES[number]

export const PAYMENT_STATUSES = [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'UNKNOWN',
] as const

export type PaymentStatus =
  typeof PAYMENT_STATUSES[number]

export interface CreatePaymentRecordInput {
  orderId: number

  transactionType:
    PaymentTransactionType

  parentPaymentId:
    number | null

  method: string

  provider:
    string | null

  providerReference:
    string | null

  /*
   * PostgreSQL numeric(14,2)
   * is passed to Drizzle as a string.
   */
  amount: string

  status:
    PaymentStatus

  failureCode:
    string | null

  failureMessage:
    string | null

  processedAt:
    string | null
}