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
  | 'PICKUP'
  | 'DELIVERY'

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
  createdByFirstName: string | null
  createdByLastName: string | null

  cashierUserId: number | null
  cashierFirstName: string | null
  cashierLastName: string | null

  managerUserId: number | null
  managerFirstName: string | null
  managerLastName: string | null

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

const manualRefreshing =
  ref(false)

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

const ORDER_REFRESH_INTERVAL_MS =
  4000

const {
  isVeryFresh:
    isVeryFreshOrder,

  getFreshnessClass:
    getOrderFreshnessClass,
} = useFreshDataHighlight()

  function formatOrderTotal(
    amount: number,
  ) {
    return new Intl.NumberFormat(
      'en-PH',
      {
        style:
          'currency',

        currency:
          'PHP',
      },
    ).format(
      amount,
    )
  }

  let orderRefreshTimer:
    number | null =
      null

async function autoRefreshOrders() {
  /*
   * Avoid unnecessary requests while
   * this browser tab is hidden or while
   * another refresh is already running.
   */
  if (
    document.visibilityState
      !== 'visible'
    || pending.value
  ) {
    return
  }

  await refresh()
}

onMounted(() => {
  orderRefreshTimer =
    window.setInterval(
      () => {
        void autoRefreshOrders()
      },
      ORDER_REFRESH_INTERVAL_MS,
    )
})

onBeforeUnmount(() => {
  if (
    orderRefreshTimer
      !== null
  ) {
    window.clearInterval(
      orderRefreshTimer,
    )

    orderRefreshTimer =
      null
  }
})

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

function getSourceClass(
  source: OrderSource,
) {
  if (
    source === 'POS'
  ) {
    return `
      border-brew-300
      bg-brew-100
      text-brew-900
    `
  }

  return `
    border-brew-200
    bg-brew-50
    text-brew-700
  `
}

function formatPersonName(
  firstName: string | null,
  lastName: string | null,
) {
  const name =
    [
      firstName?.trim(),
      lastName?.trim(),
    ]
      .filter(Boolean)
      .join(' ')

  return name || 'Name unavailable'
}

function getCreatedByPosition(
  order: StaffOrder,
) {
  if (
    order.source === 'CUSTOMER'
  ) {
    return 'Customer'
  }

  if (
    order.cashierUserId
      === order.createdByUserId
  ) {
    return 'Cashier'
  }

  if (
    order.managerUserId
      === order.createdByUserId
  ) {
    return 'Manager'
  }

  return 'Staff'
}

function formatOrderType(
  orderType: OrderType,
) {
  switch (orderType) {
    case 'DINE_IN':
      return 'Dine in'

    case 'PICKUP':
      return 'Pickup'

    case 'DELIVERY':
      return 'Delivery'

    default:
      return 'Takeout'
  }
}

function getOrderTypeClass() {
  return `
    border-amber-200
    bg-amber-50
    text-amber-800
  `
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
  if (manualRefreshing.value) {
    return
  }

  manualRefreshing.value =
    true

  try {
    await refresh()
  }
  finally {
    manualRefreshing.value =
      false
  }
}
</script>

<template>
  <section
    class="
      mx-auto
      max-w-7xl
      px-4 sm:px-6
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
            text-3xl sm:text-4xl
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
        :disabled="manualRefreshing"
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
          manualRefreshing
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
      v-if="
        pending
        && orders.length === 0
      "
      role="status"
      aria-label="Loading recent orders"
      class="
        mt-6
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-4 sm:p-6
      "
    >
      <AppTableSkeleton
        :rows="8"
        :columns="9"
      />
    </div>

    <!-- ERROR -->
      <AppStatePanel
        v-else-if="error"
        class="mt-6"
        variant="error"
        title="Unable to load recent orders"
        message="
          BrewHub could not load the latest
          customer and POS orders. Try again
          to reload the order list.
        "
      >
        <button
          type="button"
          class="
            rounded-xl
            bg-red-700
            px-5
            py-2.5
            text-sm
            font-semibold
            text-white
            transition
            hover:bg-red-800
          "
          @click="refreshOrders"
        >
          Try Again
        </button>
      </AppStatePanel>

    <!-- EMPTY -->
      <AppStatePanel
        v-else-if="
          filteredOrders.length === 0
        "
        class="mt-6"
        variant="empty"
        :title="
          search
          || sourceFilter
          || statusFilter
            ? 'No matching orders'
            : 'No recent orders yet'
        "
        :message="
          search
          || sourceFilter
          || statusFilter
            ? 'No orders match the current search or filters.'
            : 'Customer and POS orders will appear here once order activity begins.'
        "
      >
        <button
          v-if="
            search
            || sourceFilter
            || statusFilter
          "
          type="button"
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
            transition
            hover:bg-brew-50
          "
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </AppStatePanel>

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
                   <!-- MOBILE ORDER CARDS -->
          <div
            class="
              divide-y
              divide-brew-100
              md:hidden
            "
          >
            <article
              v-for="
                order in filteredOrders
              "
              :key="order.id"
              :class="[
                'p-4',
                'transition-colors',
                'duration-500',
                ...getOrderFreshnessClass(
                  order.createdAt,
                ),
              ]"
            >
              <div
                class="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div class="min-w-0">
                <div
                  class="
                    flex
                    min-w-0
                    items-center
                    gap-2
                  "
                >
                  <NuxtLink
                    :to="`/staff/orders/${order.id}`"
                    class="
                      min-w-0
                      truncate
                      text-base
                      font-bold
                      text-brew-950
                      underline-offset-4
                      transition
                      hover:text-brew-600
                      hover:underline
                    "
                  >
                    {{ order.orderNo }}
                  </NuxtLink>

                  <span
                    v-if="
                      isVeryFreshOrder(
                        order.createdAt,
                      )
                    "
                    class="
                      shrink-0
                      rounded-full
                      border
                      border-amber-300
                      bg-amber-200
                      px-2
                      py-0.5
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-amber-900
                    "
                  >
                    New
                  </span>
                </div>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-400
                  "
                >
                  Order ID {{ order.id }}
                </p>
              </div>

                <p
                  class="
                    shrink-0
                    text-base
                    font-bold
                    text-brew-950
                  "
                >
                  {{
                    formatOrderTotal(
                      order.totalAmount,
                    )
                  }}
                </p>
              </div>

              <div
                class="
                  mt-3
                  flex
                  flex-wrap
                  gap-2
                "
              >
                <span
                  class="
                    inline-flex
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-xs
                    font-semibold
                  "
                  :class="
                    getSourceClass(
                      order.source,
                    )
                  "
                >
                  {{
                    formatSource(
                      order.source,
                    )
                  }}
                </span>

                <span
                  class="
                    inline-flex
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-xs
                    font-semibold
                  "
                  :class="
                    getOrderTypeClass()
                  "
                >
                  {{
                    formatOrderType(
                      order.orderType,
                    )
                  }}
                </span>

                <span
                  class="
                    inline-flex
                    rounded-full
                    border
                    px-2.5
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
              </div>

              <div
                class="
                  mt-4
                  grid
                  grid-cols-2
                  gap-x-4
                  gap-y-4
                  border-t
                  border-brew-100
                  pt-4
                "
              >
                <div>
                  <p
                    class="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-widest
                      text-brew-400
                    "
                  >
                    Created by
                  </p>

                  <p
                    class="
                      mt-1
                      text-sm
                      font-semibold
                      text-brew-900
                    "
                  >
                    {{
                      formatPersonName(
                        order.createdByFirstName,
                        order.createdByLastName,
                      )
                    }}
                  </p>

                  <p
                    class="
                      mt-0.5
                      text-xs
                      text-brew-500
                    "
                  >
                    {{ getCreatedByPosition(order) }}
                  </p>
                </div>

                <div>
                  <p
                    class="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-widest
                      text-brew-400
                    "
                  >
                    Cashier
                  </p>

                  <p
                    class="
                      mt-1
                      text-sm
                      font-semibold
                      text-brew-900
                    "
                  >
                    <template
                      v-if="
                        order.cashierUserId !== null
                      "
                    >
                      {{
                        formatPersonName(
                          order.cashierFirstName,
                          order.cashierLastName,
                        )
                      }}
                    </template>

                    <span
                      v-else
                      class="
                        font-normal
                        text-brew-400
                      "
                    >
                      Unassigned
                    </span>
                  </p>
                </div>

                <div>
                  <p
                    class="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-widest
                      text-brew-400
                    "
                  >
                    Manager
                  </p>

                  <p
                    class="
                      mt-1
                      text-sm
                      font-semibold
                      text-brew-900
                    "
                  >
                    <template
                      v-if="
                        order.managerUserId !== null
                      "
                    >
                      {{
                        formatPersonName(
                          order.managerFirstName,
                          order.managerLastName,
                        )
                      }}
                    </template>

                    <span
                      v-else
                      class="
                        font-normal
                        text-brew-400
                      "
                    >
                      Unassigned
                    </span>
                  </p>
                </div>

                <div>
                  <p
                    class="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-widest
                      text-brew-400
                    "
                  >
                    Created
                  </p>

                  <p
                    class="
                      mt-1
                      text-sm
                      font-medium
                      text-brew-700
                    "
                  >
                    {{
                      formatDate(
                        order.createdAt,
                      )
                    }}
                  </p>
                </div>
              </div>
            </article>
          </div>

          <!-- DESKTOP ORDERS TABLE -->
          <div
            class="
              hidden
              overflow-x-auto
              md:block
            "
            tabindex="0"
            role="region"
            aria-label="Orders, scroll horizontally for more columns"
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
                Created by
              </th>

              <th class="px-5 py-4">
                Cashier
              </th>

              <th class="px-5 py-4">
                Manager
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
              :class="[
                'transition-colors',
                'duration-500',
                ...getOrderFreshnessClass(
                  order.createdAt,
                ),
              ]"
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

              <td
                class="
                  px-5
                  py-4
                  text-sm
                  text-brew-700
                "
              >
                <p class="font-medium text-brew-900">
                  {{
                    formatPersonName(
                      order.createdByFirstName,
                      order.createdByLastName,
                    )
                  }}
                </p>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-400
                  "
                >
                  {{ getCreatedByPosition(order) }}
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
                <template
                  v-if="
                    order.cashierUserId !== null
                  "
                >
                  <p class="font-medium text-brew-900">
                    {{
                      formatPersonName(
                        order.cashierFirstName,
                        order.cashierLastName,
                      )
                    }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-xs
                      text-brew-400
                    "
                  >
                    Cashier
                  </p>
                </template>

                <span
                  v-else
                  class="text-brew-400"
                >
                  Unassigned
                </span>
              </td>

              <td
                class="
                  px-5
                  py-4
                  text-sm
                  text-brew-700
                "
              >
                <template
                  v-if="
                    order.managerUserId !== null
                  "
                >
                  <p class="font-medium text-brew-900">
                    {{
                      formatPersonName(
                        order.managerFirstName,
                        order.managerLastName,
                      )
                    }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-xs
                      text-brew-400
                    "
                  >
                    Manager
                  </p>
                </template>

                <span
                  v-else
                  class="text-brew-400"
                >
                  Unassigned
                </span>
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