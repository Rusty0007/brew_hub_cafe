export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'COMPLETED',
  'CANCELLED',
] as const

export type OrderStatus =
  typeof ORDER_STATUSES[number]

export const ORDER_SOURCES = [
  'CUSTOMER',
  'POS',
] as const

export type OrderSource =
  typeof ORDER_SOURCES[number]

export const ORDER_TYPES = [
  'DINE_IN',
  'TAKEOUT',
] as const

export type OrderType =
  typeof ORDER_TYPES[number]

export interface OrderItemSnapshotInput {
  productId: number

  skuSnapshot: string
  productNameSnapshot: string

  // PostgreSQL numeric fields are intentionally
  // passed to Drizzle as strings.
  quantity: string
  unitPrice: string
  discountAmount: string
}

export interface CreateOrderRecordInput {
  orderNo: string
  branchId: number
  customerId: number | null
  createdByUserId: number
  source: OrderSource
  orderType: OrderType

  items: OrderItemSnapshotInput[]
}

export function isOrderStatus(
  value: string,
): value is OrderStatus {
  return ORDER_STATUSES.includes(
    value as OrderStatus,
  )
}

export function isOrderSource(
  value: string,
): value is OrderSource {
  return ORDER_SOURCES.includes(
    value as OrderSource,
  )
}

export function isOrderType(
  value: string,
): value is OrderType {
  return ORDER_TYPES.includes(
    value as OrderType,
  )
}