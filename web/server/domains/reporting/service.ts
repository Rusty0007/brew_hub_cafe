import {
  findActiveReportingBranchByCode,
  findDailySalesSummary,
  findLowStockProducts,
  findPaymentSummaryToday,
  findRefundSummaryToday,
  findTopSellingProductsToday,
} from './repository'

export async function getManagerReportSummary() {
  const branch =
    await findActiveReportingBranchByCode(
      'MAIN',
    )

  if (!branch) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'BrewHub branch is unavailable',
    })
  }

  const [
    sales,
    refunds,
    topProducts,
    paymentSummary,
    lowStockProducts,
  ] =
    await Promise.all([
      findDailySalesSummary(
        branch.id,
        branch.timezone,
      ),

      findRefundSummaryToday(
        branch.id,
        branch.timezone,
      ),

      findTopSellingProductsToday(
        branch.id,
        branch.timezone,
        5,
      ),

      findPaymentSummaryToday(
        branch.id,
        branch.timezone,
      ),

      findLowStockProducts(
        branch.id,
        20,
      ),
    ])

    const grossSales =
      Number(
        sales.totalSales,
      )
    
    const refundAmount =
      Number(
        refunds.refundAmount,
      )
    
    const netSales =
      grossSales
      - refundAmount

  return {
    generatedAt:
      new Date().toISOString(),

    branch: {
      id:
        branch.id,

      code:
        branch.code,

      name:
        branch.name,

      timezone:
        branch.timezone,
    },

    today: {
      completedOrders:
        Number(
          sales.completedOrders,
        ),

      grossSales,

      refundCount:
        Number(
            refunds.refundCount,
        ),

      refundAmount,

      netSales,

      posSales:
        Number(
          sales.posSales,
        ),

      customerSales:
        Number(
          sales.customerSales,
        ),
    },

    topProducts:
      topProducts.map(
        product => ({
          ...product,

          quantitySold:
            Number(
              product.quantitySold,
            ),

          salesAmount:
            Number(
              product.salesAmount,
            ),
        }),
      ),

    paymentSummary:
      paymentSummary.map(
        payment => ({
          ...payment,

          paymentCount:
            Number(
              payment.paymentCount,
            ),

          amount:
            Number(
              payment.amount,
            ),
        }),
      ),

    lowStockProducts:
      lowStockProducts.map(
        product => ({
          ...product,

          onHandQty:
            Number(
              product.onHandQty,
            ),

          reservedQty:
            Number(
              product.reservedQty,
            ),

          availableQty:
            Number(
              product.availableQty ?? 0,
            ),

          reorderLevel:
            Number(
              product.reorderLevel,
            ),
        }),
      ),
  }
}