<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'customer',
  ],
})

interface CustomerOrder {
  id: number
  orderNo: string
  source: string
  orderType: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  createdAt: string
  completedAt?: string | null
  cancelledAt?: string | null
}

interface OrdersResponse {
  orders: CustomerOrder[]
}

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<OrdersResponse>(
  '/api/customer/orders',
)

const orders = computed(
  () => data.value?.orders ?? [],
)

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  ).format(value)
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-PH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(
    new Date(value),
  )
}

function formatOrderType(
  value: string,
) {
  if (value === 'DINE_IN') {
    return 'Dine in'
  }

  if (value === 'TAKEOUT') {
    return 'Takeout'
  }

  return value
}

function formatStatus(
  value: string,
) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase(),
    )
}

function statusClasses(
  status: string,
) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'

    case 'PAID':
      return 'bg-emerald-100 text-emerald-800'

    case 'PENDING_PAYMENT':
      return 'bg-amber-100 text-amber-800'

    case 'CANCELLED':
      return 'bg-red-100 text-red-700'

    default:
      return 'bg-brew-100 text-brew-700'
  }
}
</script>

<template>
  <main
    class="
      mx-auto
      w-full max-w-6xl
      px-6 py-12
      lg:px-8
    "
  >
    <!-- HEADER -->
    <div
      class="
        flex flex-col
        gap-4
        sm:flex-row
        sm:items-end
        sm:justify-between
      "
    >
      <div>
        <p
          class="
            text-xs font-semibold
            uppercase
            tracking-[0.2em]
            text-brew-500
          "
        >
          My Account
        </p>

        <h1
          class="
            mt-2
            text-3xl font-semibold
            tracking-tight
            text-brew-950
          "
        >
          My Orders
        </h1>

        <p
          class="
            mt-2
            text-sm
            text-brew-500
          "
        >
          View your recent BrewHub
          orders and their current status.
        </p>
      </div>

      <NuxtLink
        to="/catalog"
        class="
          text-sm font-semibold
          text-brew-700
          transition
          hover:text-brew-950
        "
      >
        Browse menu →
      </NuxtLink>
    </div>

    <!-- LOADING -->
    <section
      v-if="pending"
      class="
        mt-8
        rounded-3xl
        border border-brew-100
        bg-white
        p-8
        text-sm
        text-brew-500
        shadow-sm
      "
    >
      Loading your orders...
    </section>

    <!-- ERROR -->
    <section
      v-else-if="error"
      class="
        mt-8
        rounded-3xl
        border border-red-200
        bg-red-50
        p-6
      "
    >
      <p
        class="
          font-semibold
          text-red-700
        "
      >
        Unable to load your orders.
      </p>

      <button
        type="button"
        class="
          mt-4
          rounded-xl
          border border-red-200
          px-4 py-2
          text-sm font-semibold
          text-red-700
          transition
          hover:bg-red-100
        "
        @click="refresh()"
      >
        Try again
      </button>
    </section>

    <!-- EMPTY -->
    <section
      v-else-if="
        orders.length === 0
      "
      class="
        mt-8
        rounded-3xl
        border border-brew-100
        bg-white
        px-6 py-16
        text-center
        shadow-sm
      "
    >
      <div
        class="
          mx-auto
          flex size-16
          items-center
          justify-center
          rounded-full
          bg-brew-100
          text-brew-800
        "
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          class="size-7"
          aria-hidden="true"
        >
          <path
            d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />

          <path
            d="M9 8h6M9 12h6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </div>

      <h2
        class="
          mt-5
          text-xl font-semibold
          text-brew-950
        "
      >
        No orders yet
      </h2>

      <p
        class="
          mt-2
          text-sm
          text-brew-500
        "
      >
        Your BrewHub orders will
        appear here after you place one.
      </p>

      <NuxtLink
        to="/catalog"
        class="
          mt-6
          inline-flex
          rounded-2xl
          bg-brew-900
          px-5 py-3
          text-sm font-semibold
          text-white
          transition
          hover:bg-brew-800
        "
      >
        Browse menu
      </NuxtLink>
    </section>

    <!-- ORDER LIST -->
    <section
      v-else
      class="
        mt-8
        overflow-hidden
        rounded-3xl
        border border-brew-100
        bg-white
        shadow-sm
      "
    >
      <article
        v-for="order in orders"
        :key="order.id"
        class="
          border-b
          border-brew-100
          p-6
          last:border-b-0
          sm:p-7
        "
      >
        <div
          class="
            flex flex-col
            gap-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div
              class="
                flex flex-wrap
                items-center
                gap-3
              "
            >
              <h2
                class="
                  font-semibold
                  text-brew-950
                "
              >
                {{ order.orderNo }}
              </h2>

              <span
                class="
                  rounded-full
                  px-3 py-1
                  text-xs font-semibold
                "
                :class="
                  statusClasses(
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
                mt-3
                flex flex-wrap
                gap-x-5 gap-y-2
                text-sm
                text-brew-500
              "
            >
              <span>
                {{
                  formatDate(
                    order.createdAt,
                  )
                }}
              </span>

              <span>
                {{
                  formatOrderType(
                    order.orderType,
                  )
                }}
              </span>
            </div>
          </div>

          <div
            class="
              flex items-center
              justify-between
              gap-6
              sm:justify-end
            "
          >
            <div
              class="
                text-right
              "
            >
              <p
                class="
                  text-xs
                  uppercase
                  tracking-wider
                  text-brew-400
                "
              >
                Total
              </p>

              <p
                class="
                  mt-1
                  text-lg font-semibold
                  text-brew-950
                "
              >
                {{
                  formatPrice(
                    order.totalAmount,
                  )
                }}
              </p>
            </div>

            <NuxtLink
              :to="
                `/account/orders/${order.id}`
              "
              class="
                rounded-2xl
                border border-brew-200
                px-4 py-2.5
                text-sm font-semibold
                text-brew-700
                transition
                hover:bg-brew-50
                hover:text-brew-950
              "
            >
              View
            </NuxtLink>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>``