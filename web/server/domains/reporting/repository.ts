import {
  and,
  asc,
  desc,
  eq,
  lte,
  sql,
} from 'drizzle-orm'

import {
  branches,
  inventory,
  orderItems,
  orders,
  payments,
  products,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

function completedTodayCondition(
  branchId: number,
  timezone: string,
) {
  return and(
    eq(
      orders.branchId,
      branchId,
    ),

    eq(
      orders.status,
      'COMPLETED',
    ),

    sql`
      ${orders.completedAt}
      IS NOT NULL
    `,

    sql`
      ${orders.completedAt}
      >= (
        date_trunc(
          'day',
          now()
            AT TIME ZONE ${timezone}
        )
        AT TIME ZONE ${timezone}
      )
    `,

    sql`
      ${orders.completedAt}
      < (
        (
          date_trunc(
            'day',
            now()
              AT TIME ZONE ${timezone}
          )
          + interval '1 day'
        )
        AT TIME ZONE ${timezone}
      )
    `,
  )
}

export async function findActiveReportingBranchByCode(
  code: string,
) {
  const db =
    useDb()

  const rows =
    await db
      .select({
        id:
          branches.id,

        code:
          branches.code,

        name:
          branches.name,

        timezone:
          branches.timezone,
      })
      .from(
        branches,
      )
      .where(
        and(
          eq(
            branches.code,
            code,
          ),

          eq(
            branches.isActive,
            true,
          ),
        ),
      )
      .limit(1)

  return rows[0] ?? null
}

export async function findDailySalesSummary(
  branchId: number,
  timezone: string,
) {
  const db =
    useDb()

  const rows =
    await db
      .select({
        completedOrders:
          sql<number>`
            count(*)::integer
          `,

        totalSales:
          sql<string>`
            coalesce(
              sum(
                ${orders.totalAmount}
              ),
              0
            )
          `,

        posSales:
          sql<string>`
            coalesce(
              sum(
                case
                  when ${orders.source}
                    = 'POS'
                  then ${orders.totalAmount}
                  else 0
                end
              ),
              0
            )
          `,

        customerSales:
          sql<string>`
            coalesce(
              sum(
                case
                  when ${orders.source}
                    = 'CUSTOMER'
                  then ${orders.totalAmount}
                  else 0
                end
              ),
              0
            )
          `,
      })
      .from(
        orders,
      )
      .where(
        completedTodayCondition(
          branchId,
          timezone,
        ),
      )

  return rows[0] ?? {
    completedOrders: 0,
    totalSales: '0',
    posSales: '0',
    customerSales: '0',
  }
}

export async function findRefundSummaryToday(
  branchId: number,
  timezone: string,
) {
  const db =
    useDb()

  const rows =
    await db
      .select({
        refundCount:
          sql<number>`
            count(*)::integer
          `,

        refundAmount:
          sql<string>`
            coalesce(
              sum(
                ${payments.amount}
              ),
              0
            )
          `,
      })
      .from(
        payments,
      )
      .innerJoin(
        orders,
        eq(
          payments.orderId,
          orders.id,
        ),
      )
      .where(
        and(
          eq(
            orders.branchId,
            branchId,
          ),

          eq(
            payments.transactionType,
            'REFUND',
          ),

          eq(
            payments.status,
            'SUCCEEDED',
          ),

          sql`
            ${payments.processedAt}
            IS NOT NULL
          `,

          sql`
            ${payments.processedAt}
            >= (
              date_trunc(
                'day',
                now()
                  AT TIME ZONE ${timezone}
              )
              AT TIME ZONE ${timezone}
            )
          `,

          sql`
            ${payments.processedAt}
            < (
              (
                date_trunc(
                  'day',
                  now()
                    AT TIME ZONE ${timezone}
                )
                + interval '1 day'
              )
              AT TIME ZONE ${timezone}
            )
          `,
        ),
      )

  return rows[0] ?? {
    refundCount: 0,
    refundAmount: '0',
  }
}

export async function findTopSellingProductsToday(
  branchId: number,
  timezone: string,
  limit = 5,
) {
  const db =
    useDb()

  const safeLimit =
    Math.min(
      Math.max(
        limit,
        1,
      ),
      20,
    )

  return db
    .select({
      productId:
        orderItems.productId,

      sku:
        orderItems.skuSnapshot,

      productName:
        orderItems.productNameSnapshot,

      quantitySold:
        sql<string>`
          coalesce(
            sum(
              ${orderItems.quantity}
            ),
            0
          )
        `,

      salesAmount:
        sql<string>`
          coalesce(
            sum(
              ${orderItems.lineTotal}
            ),
            0
          )
        `,
    })
    .from(
      orderItems,
    )
    .innerJoin(
      orders,
      eq(
        orderItems.orderId,
        orders.id,
      ),
    )
    .where(
      completedTodayCondition(
        branchId,
        timezone,
      ),
    )
    .groupBy(
      orderItems.productId,
      orderItems.skuSnapshot,
      orderItems.productNameSnapshot,
    )
    .orderBy(
      desc(
        sql`
          sum(
            ${orderItems.quantity}
          )
        `,
      ),
    )
    .limit(
      safeLimit,
    )
}

export async function findPaymentSummaryToday(
  branchId: number,
  timezone: string,
) {
  const db =
    useDb()

  return db
    .select({
      method:
        payments.method,

      paymentCount:
        sql<number>`
          count(*)::integer
        `,

      amount:
        sql<string>`
          coalesce(
            sum(
              ${payments.amount}
            ),
            0
          )
        `,
    })
    .from(
      payments,
    )
    .innerJoin(
      orders,
      eq(
        payments.orderId,
        orders.id,
      ),
    )
    .where(
      and(
        completedTodayCondition(
          branchId,
          timezone,
        ),

        eq(
          payments.transactionType,
          'PAYMENT',
        ),

        eq(
          payments.status,
          'SUCCEEDED',
        ),
      ),
    )
    .groupBy(
      payments.method,
    )
    .orderBy(
      desc(
        sql`
          sum(
            ${payments.amount}
          )
        `,
      ),
    )
}

export async function findLowStockProducts(
  branchId: number,
  limit = 20,
) {
  const db =
    useDb()

  const safeLimit =
    Math.min(
      Math.max(
        limit,
        1,
      ),
      100,
    )

  return db
    .select({
      productId:
        products.id,

      sku:
        products.sku,

      productName:
        products.name,

      onHandQty:
        inventory.onHandQty,

      reservedQty:
        inventory.reservedQty,

      availableQty:
        inventory.availableQty,

      reorderLevel:
        inventory.reorderLevel,
    })
    .from(
      inventory,
    )
    .innerJoin(
      products,
      eq(
        inventory.productId,
        products.id,
      ),
    )
    .where(
      and(
        eq(
          inventory.branchId,
          branchId,
        ),

        eq(
          products.isActive,
          true,
        ),

        eq(
          products.trackInventory,
          true,
        ),

        lte(
          inventory.availableQty,
          inventory.reorderLevel,
        ),
      ),
    )
    .orderBy(
      asc(
        inventory.availableQty,
      ),
      asc(
        products.name,
      ),
    )
    .limit(
      safeLimit,
    )
}