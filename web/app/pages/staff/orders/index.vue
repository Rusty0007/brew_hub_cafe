<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'cashier',
  ],
})

type OrderSource =
  | 'CUSTOMER'
  | 'POS'

type OrderType =
  | 'DINE_IN'
  | 'TAKEOUT'

type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED'

interface StaffOrder {
  id: number
  orderNo: string
  branchId: number
  customerId: number | null
  createdByUserId: number
  source: OrderSource
  orderType: OrderType
  status: OrderStatus
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  version: number
  createdAt: string
  completedAt: string | null
  cancelledAt: string | null
}

interface StaffOrdersResponse {
  orders: StaffOrder[]

  meta: {
    count: number
    limit: number
  }
}

const sourceFilter =
  ref('')

const statusFilter =
  ref('')

const search =
  ref('')

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<StaffOrdersResponse>(
  '/api/staff/orders',
  {
    query: {
      limit: 100,
    },
  },
)

const orders =
  computed(
    () => data.value?.orders ?? [],
  )

const filteredOrders =
  computed(() => {
    const searchValue =
      search.value
        .trim()
        .toLowerCase()

    return orders.value.filter(
      (order) => {
        if (
          sourceFilter.value
          && order.source
            !== sourceFilter.value
        ) {
          return false
        }

        if (
          statusFilter.value
          && order.status
            !== statusFilter.value
        ) {
          return false
        }

        if (
          searchValue
          && !order.orderNo
            .toLowerCase()
            .includes(searchValue)
        ) {
          return false
        }

        return true
      },
    )
  })

const pesoFormatter =
  new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
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

function formatDate(
  value: string,
) {
  return dateFormatter.format(
    new Date(value),
  )
}

function formatSource(
  source: OrderSource,
) {
  return source === 'POS'
    ? 'POS'
    : 'Customer'
}

function formatOrderType(
  orderType: OrderType,
) {
  return orderType === 'DINE_IN'
    ? 'Dine in'
    : 'Takeout'
}

function formatStatus(
  status: OrderStatus,
) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Pending Payment'

    case 'COMPLETED':
      return 'Completed'

    case 'CANCELLED':
      return 'Cancelled'

    case 'PAID':
      return 'Paid'

    default:
      return 'Draft'
  }
}

function getStatusClass(
  status: OrderStatus,
) {
  switch (status) {
    case 'COMPLETED':
      return `
        border-green-200
        bg-green-50
        text-green-700
      `

    case 'PENDING_PAYMENT':
      return `
        border-amber-200
        bg-amber-50
        text-amber-700
      `

    case 'CANCELLED':
      return `
        border-red-200
        bg-red-50
        text-red-700
      `

    case 'PAID':
      return `
        border-blue-200
        bg-blue-50
        text-blue-700
      `

    default:
      return `
        border-brew-200
        bg-brew-50
        text-brew-700
      `
  }
}

function clearFilters() {
  search.value = ''
  sourceFilter.value = ''
  statusFilter.value = ''
}

async function refreshOrders() {
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
          to="/staff/cashier"
          class="
            text-sm
            font-semibold
            text-brew-600
            transition
            hover:text-brew-900
          "
        >
          ← Back to Cashier Workspace
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
          Sales Operations
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
          Recent Orders
        </h1>

        <p
          class="
            mt-3
            max-w-2xl
            leading-7
            text-brew-500
          "
        >
          Review recent customer
          and point-of-sale orders.
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
        @click="refreshOrders"
      >
        {{
          pending
            ? 'Refreshing...'
            : 'Refresh'
        }}
      </button>
    </div>

    <!-- FILTERS -->
    <div
      class="
        mt-10
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-5
        shadow-sm
      "
    >
      <div
        class="
          grid
          gap-4
          md:grid-cols-3
        "
      >
        <label>
          <span
            class="
              text-sm
              font-medium
              text-brew-800
            "
          >
            Search order
          </span>

          <input
            v-model="search"
            type="search"
            placeholder="Order number"
            class="
              mt-2
              w-full
              rounded-xl
              border
              border-brew-200
              bg-white
              px-4
              py-2.5
              text-brew-950
              outline-none
              transition
              focus:border-brew-500
            "
          >
        </label>

        <label>
          <span
            class="
              text-sm
              font-medium
              text-brew-800
            "
          >
            Source
          </span>

          <select
            v-model="sourceFilter"
            class="
              mt-2
              w-full
              rounded-xl
              border
              border-brew-200
              bg-white
              px-4
              py-2.5
              text-brew-950
              outline-none
              focus:border-brew-500
            "
          >
            <option value="">
              All sources
            </option>

            <option value="POS">
              POS
            </option>

            <option value="CUSTOMER">
              Customer
            </option>
          </select>
        </label>

        <label>
          <span
            class="
              text-sm
              font-medium
              text-brew-800
            "
          >
            Status
          </span>

          <select
            v-model="statusFilter"
            class="
              mt-2
              w-full
              rounded-xl
              border
              border-brew-200
              bg-white
              px-4
              py-2.5
              text-brew-950
              outline-none
              focus:border-brew-500
            "
          >
            <option value="">
              All statuses
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="PENDING_PAYMENT">
              Pending Payment
            </option>

            <option value="PAID">
              Paid
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>
        </label>
      </div>

      <div
        v-if="
          search
          || sourceFilter
          || statusFilter
        "
        class="mt-4"
      >
        <button
          type="button"
          class="
            text-sm
            font-semibold
            text-brew-600
            hover:text-brew-900
          "
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <div
      v-if="pending"
      class="
        mt-6
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-8
        text-center
        text-brew-500
      "
    >
      Loading orders...
    </div>

    <!-- ERROR -->
    <div
      v-else-if="error"
      class="
        mt-6
        rounded-3xl
        border
        border-red-200
        bg-red-50
        p-6
        text-red-700
      "
    >
      Unable to load recent orders.
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="
        filteredOrders.length === 0
      "
      class="
        mt-6
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-10
        text-center
      "
    >
      <h2
        class="
          text-lg
          font-semibold
          text-brew-950
        "
      >
        No orders found
      </h2>

      <p
        class="
          mt-2
          text-sm
          text-brew-500
        "
      >
        Try changing your filters.
      </p>
    </div>

    <!-- ORDERS TABLE -->
    <div
      v-else
      class="
        mt-6
        overflow-hidden
        rounded-3xl
        border
        border-brew-200
        bg-white
        shadow-sm
      "
    >
      <div
        class="overflow-x-auto"
      >
        <table
          class="
            w-full
            min-w-225
            text-left
          "
        >
          <thead
            class="
              border-b
              border-brew-200
              bg-brew-50
            "
          >
            <tr
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.12em]
                text-brew-500
              "
            >
              <th class="px-5 py-4">
                Order
              </th>

              <th class="px-5 py-4">
                Source
              </th>

              <th class="px-5 py-4">
                Type
              </th>

              <th class="px-5 py-4">
                Status
              </th>

              <th class="px-5 py-4">
                Total
              </th>

              <th class="px-5 py-4">
                Created
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
                order in filteredOrders
              "
              :key="order.id"
              class="
                transition
                hover:bg-brew-50/60
              "
            >
              <td
                class="px-5 py-4"
              >
                <NuxtLink
                  :to="`/staff/orders/${order.id}`"
                  class="
                    font-semibold
                    text-brew-950
                    underline-offset-4
                    transition
                    hover:text-brew-600
                    hover:underline
                  "
                >
                  {{ order.orderNo }}
                </NuxtLink>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-400
                  "
                >
                  ID {{ order.id }}
                </p>
              </td>

              <td
                class="
                  px-5
                  py-4
                  text-sm
                  text-brew-700
                "
              >
                {{
                  formatSource(
                    order.source,
                  )
                }}
              </td>

              <td
                class="
                  px-5
                  py-4
                  text-sm
                  text-brew-700
                "
              >
                {{
                  formatOrderType(
                    order.orderType,
                  )
                }}
              </td>

              <td class="px-5 py-4">
                <span
                  class="
                    inline-flex
                    rounded-full
                    border
                    px-3
                    py-1
                    text-xs
                    font-semibold
                  "
                  :class="
                    getStatusClass(
                      order.status,
                    )
                  "
                >
                  {{
                    formatStatus(
                      order.status,
                    )
                  }}
                </span>
              </td>

              <td
                class="
                  px-5
                  py-4
                  font-semibold
                  text-brew-950
                "
              >
                {{
                  formatMoney(
                    order.totalAmount,
                  )
                }}
              </td>

              <td
                class="
                  px-5
                  py-4
                  text-sm
                  text-brew-600
                "
              >
                {{
                  formatDate(
                    order.createdAt,
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="
          border-t
          border-brew-100
          px-5
          py-4
          text-sm
          text-brew-500
        "
      >
        Showing
        {{ filteredOrders.length }}
        of
        {{ orders.length }}
        loaded orders.
      </div>
    </div>
  </section>
</template>