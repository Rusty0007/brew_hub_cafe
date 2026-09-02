export interface ReserveStockInput {
  orderId: number
  productId: number
  quantity: number

  expiresAt?: Date | null

  userId?: number | null
  traceId?: string | null
}

export interface ReleaseReservationInput {
  reservationId: number

  reason?: string

  userId?: number | null
  traceId?: string | null

  finalStatus?:
    | 'RELEASED'
    | 'EXPIRED'
}

export interface ReceiveStockInput {
  branchId: number
  productId: number
  quantity: number

  reference?: string | null
  reason?: string

  userId?: number | null
  traceId?: string | null
}

export interface AdjustStockInput {
  branchId: number
  productId: number

  delta: number
  reason: string

  userId: number
  traceId?: string | null
}

export interface StockMovementQuery {
  branchId: number
  productId?: number
  orderId?: number
  limit?: number
}

export interface InventorySnapshot {
  id: number
  branchId: number
  productId: number

  sku: string
  productName: string

  onHandQty: number
  reservedQty: number
  availableQty: number
  reorderLevel: number

  version: number
  updatedAt: string
}

export interface InventoryReservationSnapshot {
  id: number
  orderId: number
  branchId: number
  productId: number

  sku: string
  productName: string

  quantity: number
  status: string

  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StockMovementSnapshot {
  id: number
  branchId: number
  productId: number

  sku: string
  productName: string

  orderId: number | null
  reservationId: number | null

  movementType: string

  onHandDelta: number
  reservedDelta: number

  onHandAfter: number
  reservedAfter: number

  reference: string | null
  reason: string | null

  createdByUserId: number | null
  traceId: string | null

  createdAt: string
}