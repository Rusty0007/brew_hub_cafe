<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
  ],
})

interface ManagerReportResponse {
  report: {
    generatedAt: string

    branch: {
      id: number
      code: string
      name: string
      timezone: string
    }

    today: {
      completedOrders: number
      grossSales: number
      refundCount: number
      refundAmount: number
      netSales: number
      posSales: number
      customerSales: number
    }

    topProducts: Array<{
      productId: number
      sku: string
      productName: string
      quantitySold: number
      salesAmount: number
    }>

    paymentSummary: Array<{
      method: string
      paymentCount: number
      amount: number
    }>

    lowStockProducts: Array<{
      productId: number
      sku: string
      productName: string
      onHandQty: number
      reservedQty: number
      availableQty: number
      reorderLevel: number
    }>
  }
}

const {
  data,
  pending,
  error,
  refresh,
} =
  await useFetch<ManagerReportResponse>(
    '/api/manager/reports/summary',
  )

const report =
  computed(
    () => data.value?.report,
  )

const pesoFormatter =
  new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  )

const numberFormatter =
  new Intl.NumberFormat(
    'en-PH',
    {
      maximumFractionDigits: 3,
    },
  )

const dateFormatter =
  new Intl.DateTimeFormat(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  )

function formatMoney(
  value: number,
) {
  return pesoFormatter.format(
    Number(value ?? 0),
  )
}

function formatNumber(
  value: number,
) {
  return numberFormatter.format(
    Number(value ?? 0),
  )
}

function formatDate(
  value: string,
) {
  return dateFormatter.format(
    new Date(value),
  )
}

function formatLabel(
  value: string,
) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase(),
    )
}

async function refreshReport() {
  await refresh()
}
</script>

<template>
  <section
    class="
      mx-auto
      max-w-7xl
      px-6
      py-10
      lg:px-8
    "
  >
    <!-- HEADER -->
    <div
      class="
        flex
        flex-col
        gap-5
        sm:flex-row
        sm:items-end
        sm:justify-between
      "
    >
      <div>
        <NuxtLink
          to="/staff/manager"
          class="
            text-sm
            font-semibold
            text-brew-600
            transition
            hover:text-brew-900
          "
        >
          ← Back to Manager Workspace
        </NuxtLink>

        <p
          class="
            mt-6
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-brew-500
          "
        >
          Reporting
        </p>

        <h1
          class="
            mt-2
            text-4xl
            font-semibold
            tracking-tight
            text-brew-950
          "
        >
          Manager Reports
        </h1>

        <p
          class="
            mt-3
            max-w-2xl
            leading-7
            text-brew-500
          "
        >
          Review today's completed sales,
          product performance, payments,
          and inventory alerts.
        </p>
      </div>

      <button
        type="button"
        :disabled="pending"
        class="
          rounded-xl
          border
          border-brew-200
          bg-white
          px-5
          py-2.5
          text-sm
          font-semibold
          text-brew-700
          shadow-sm
          transition
          hover:bg-brew-50
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
        @click="refreshReport"
      >
        {{
          pending
            ? 'Refreshing...'
            : 'Refresh'
        }}
      </button>
    </div>

    <!-- LOADING -->
    <div
      v-if="pending"
      class="
        mt-8
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-10
        text-center
        text-brew-500
      "
    >
      Loading reports...
    </div>

    <!-- ERROR -->
    <div
      v-else-if="error"
      class="
        mt-8
        rounded-3xl
        border
        border-red-200
        bg-red-50
        p-6
        text-red-700
      "
    >
      Unable to load manager reports.
    </div>

    <template v-else-if="report">
      <!-- REPORT CONTEXT -->
      <div
        class="
          mt-8
          flex
          flex-wrap
          items-center
          justify-between
          gap-4
          rounded-2xl
          border
          border-brew-200
          bg-brew-50
          px-5
          py-4
        "
      >
        <div>
          <p
            class="
              text-sm
              font-semibold
              text-brew-900
            "
          >
            {{ report.branch.name }}
          </p>

          <p
            class="
              mt-1
              text-xs
              text-brew-500
            "
          >
            Branch {{ report.branch.code }}
            · {{ report.branch.timezone }}
          </p>
        </div>

        <p
          class="
            text-xs
            text-brew-500
          "
        >
          Generated
          {{ formatDate(report.generatedAt) }}
        </p>
      </div>

      <!-- SUMMARY CARDS -->
        <div
          class="
            mt-6
            grid
            gap-5
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <!-- GROSS SALES -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Gross Sales
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-brew-950
              "
            >
              {{
                formatMoney(
                  report.today.grossSales,
                )
              }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Completed orders before refunds
            </p>
          </div>
      
          <!-- COMPLETED ORDERS -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Completed Orders
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-brew-950
              "
            >
              {{ report.today.completedOrders }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Orders completed today
            </p>
          </div>
      
          <!-- POS SALES -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              POS Sales
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-brew-950
              "
            >
              {{
                formatMoney(
                  report.today.posSales,
                )
              }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Cashier-created orders
            </p>
          </div>
      
          <!-- CUSTOMER SALES -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Customer Sales
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-brew-950
              "
            >
              {{
                formatMoney(
                  report.today.customerSales,
                )
              }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Customer-created orders
            </p>
          </div>
      
          <!-- REFUNDS -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Refunds
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-red-700
              "
            >
              {{
                formatMoney(
                  report.today.refundAmount,
                )
              }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              {{ report.today.refundCount }}
              successful
              {{
                report.today.refundCount === 1
                  ? 'refund'
                  : 'refunds'
              }}
              today
            </p>
          </div>
      
          <!-- NET SALES -->
          <div
            class="
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-6
              shadow-sm
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Net Sales
            </p>
        
            <p
              class="
                mt-4
                text-3xl
                font-semibold
                tracking-tight
                text-brew-950
              "
            >
              {{
                formatMoney(
                  report.today.netSales,
                )
              }}
            </p>
        
            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Gross sales minus refunds
            </p>
          </div>
</div>
        

      <!-- TOP PRODUCTS + PAYMENTS -->
      <div
        class="
          mt-6
          grid
          gap-6
          xl:grid-cols-3
        "
      >
        <!-- TOP PRODUCTS -->
        <div
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-6
            shadow-sm
            xl:col-span-2
          "
        >
          <div>
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Product Performance
            </p>

            <h2
              class="
                mt-2
                text-xl
                font-semibold
                text-brew-950
              "
            >
              Top-selling Products
            </h2>
          </div>

          <p
            v-if="
              report.topProducts.length === 0
            "
            class="
              mt-6
              text-sm
              text-brew-500
            "
          >
            No completed product sales today.
          </p>

          <div
            v-else
            class="
              mt-5
              overflow-x-auto
            "
          >
            <table
              class="
                w-full
                min-w-150
                text-left
              "
            >
              <thead
                class="
                  border-b
                  border-brew-200
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-brew-500
                "
              >
                <tr>
                  <th class="py-3 pr-5">
                    Product
                  </th>

                  <th class="py-3 pr-5">
                    SKU
                  </th>

                  <th class="py-3 pr-5">
                    Quantity
                  </th>

                  <th class="py-3">
                    Sales
                  </th>
                </tr>
              </thead>

              <tbody
                class="
                  divide-y
                  divide-brew-100
                "
              >
                <tr
                  v-for="
                    product
                    in report.topProducts
                  "
                  :key="product.productId"
                >
                  <td
                    class="
                      py-4
                      pr-5
                      font-medium
                      text-brew-950
                    "
                  >
                    {{ product.productName }}
                  </td>

                  <td
                    class="
                      py-4
                      pr-5
                      text-sm
                      text-brew-500
                    "
                  >
                    {{ product.sku }}
                  </td>

                  <td
                    class="
                      py-4
                      pr-5
                      text-brew-700
                    "
                  >
                    {{
                      formatNumber(
                        product.quantitySold,
                      )
                    }}
                  </td>

                  <td
                    class="
                      py-4
                      font-semibold
                      text-brew-950
                    "
                  >
                    {{
                      formatMoney(
                        product.salesAmount,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PAYMENT SUMMARY -->
        <div
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-6
            shadow-sm
          "
        >
          <p
            class="
              text-xs
              font-semibold
              uppercase
              tracking-[0.14em]
              text-brew-500
            "
          >
            Payments
          </p>

          <h2
            class="
              mt-2
              text-xl
              font-semibold
              text-brew-950
            "
          >
            Payment Summary
          </h2>

          <p
            v-if="
              report.paymentSummary.length
                === 0
            "
            class="
              mt-6
              text-sm
              text-brew-500
            "
          >
            No successful payments today.
          </p>

          <div
            v-else
            class="
              mt-5
              divide-y
              divide-brew-100
            "
          >
            <div
              v-for="
                payment
                in report.paymentSummary
              "
              :key="payment.method"
              class="
                flex
                items-center
                justify-between
                gap-4
                py-4
              "
            >
              <div>
                <p
                  class="
                    font-semibold
                    text-brew-950
                  "
                >
                  {{
                    formatLabel(
                      payment.method,
                    )
                  }}
                </p>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-500
                  "
                >
                  {{ payment.paymentCount }}
                  successful
                  {{
                    payment.paymentCount === 1
                      ? 'payment'
                      : 'payments'
                  }}
                </p>
              </div>

              <p
                class="
                  font-semibold
                  text-brew-950
                "
              >
                {{
                  formatMoney(
                    payment.amount,
                  )
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- LOW STOCK -->
      <div
        class="
          mt-6
          rounded-3xl
          border
          border-brew-200
          bg-white
          p-6
          shadow-sm
        "
      >
        <div
          class="
            flex
            flex-wrap
            items-end
            justify-between
            gap-4
          "
        >
          <div>
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.14em]
                text-brew-500
              "
            >
              Inventory
            </p>

            <h2
              class="
                mt-2
                text-xl
                font-semibold
                text-brew-950
              "
            >
              Low-stock Products
            </h2>

            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              Products whose available
              quantity is at or below
              their reorder level.
            </p>
          </div>

          <span
            class="
              rounded-full
              border
              border-brew-200
              bg-brew-50
              px-3
              py-1
              text-xs
              font-semibold
              text-brew-700
            "
          >
            {{
              report.lowStockProducts.length
            }}
            flagged
          </span>
        </div>

        <div
          v-if="
            report.lowStockProducts.length
              === 0
          "
          class="
            mt-6
            rounded-2xl
            border
            border-green-200
            bg-green-50
            p-5
            text-sm
            text-green-700
          "
        >
          No products are currently at
          or below their reorder level.
        </div>

        <div
          v-else
          class="
            mt-6
            overflow-x-auto
          "
        >
          <table
            class="
              w-full
              min-w-175
              text-left
            "
          >
            <thead
              class="
                border-b
                border-brew-200
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-brew-500
              "
            >
              <tr>
                <th class="py-3 pr-5">
                  Product
                </th>

                <th class="py-3 pr-5">
                  On Hand
                </th>

                <th class="py-3 pr-5">
                  Reserved
                </th>

                <th class="py-3 pr-5">
                  Available
                </th>

                <th class="py-3">
                  Reorder Level
                </th>
              </tr>
            </thead>

            <tbody
              class="
                divide-y
                divide-brew-100
              "
            >
              <tr
                v-for="
                  product
                  in report.lowStockProducts
                "
                :key="product.productId"
              >
                <td class="py-4 pr-5">
                  <p
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{ product.productName }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-xs
                      text-brew-500
                    "
                  >
                    {{ product.sku }}
                  </p>
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-brew-700
                  "
                >
                  {{
                    formatNumber(
                      product.onHandQty,
                    )
                  }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-brew-700
                  "
                >
                  {{
                    formatNumber(
                      product.reservedQty,
                    )
                  }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    font-semibold
                    text-red-700
                  "
                >
                  {{
                    formatNumber(
                      product.availableQty,
                    )
                  }}
                </td>

                <td
                  class="
                    py-4
                    text-brew-700
                  "
                >
                  {{
                    formatNumber(
                      product.reorderLevel,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>