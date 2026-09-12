<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'customer',
  ],
})

const {
  $csrfFetch,
} = useNuxtApp()

interface OrderItem {
  id: number
  orderId: number
  productId: number
  skuSnapshot: string
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  createdAt: string
}

interface CustomerOrder {
  id: number
  orderNo: string

  branchId: number
  customerId: number | null
  createdByUserId: number

  source: string
  orderType: string
  status: string

  paymentState:
  | 'VERIFYING'
  | null

  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number

  version: number

  createdAt: string
  updatedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null

  items: OrderItem[]
}

interface OrderResponse {
  order: CustomerOrder
}

const route = useRoute()

const {
  showConfirm,
  showSuccess,
  showError,
  showWarning,
} = useAppModal()

const orderId = computed(() =>
  Number(route.params.id),
)

if (
  !Number.isInteger(orderId.value)
  || orderId.value <= 0
) {
  throw createError({
    statusCode: 404,
    statusMessage:
      'Order not found',
  })
}

const {
  data,
  pending,
  error,
  refresh,
} = await useLazyFetch<OrderResponse>(
  () =>
    `/api/customer/orders/${orderId.value}`,
)

const ORDER_REFRESH_INTERVAL_MS =
  4000

let orderRefreshTimer:
  number | null =
    null

async function autoRefreshOrder() {
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
        void autoRefreshOrder()
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

const order = computed(
  () => data.value?.order ?? null,
)

const preparingPayment =
  ref(false)

const simulatingPayment =
  ref(false)

const showCancelForm =
  ref(false)

const cancellingOrder =
  ref(false)

const cancellationReason =
  ref('')

const isDevelopment =
  import.meta.dev

const {
  getOrCreateTraceId,
} = useCheckoutTrace()

async function preparePayment() {
  if (!order.value) {
    return
  }

  preparingPayment.value = true

  try {
  const checkoutTraceId =
    getOrCreateTraceId(
      order.value.id,
    )

  await $csrfFetch(
    `/api/customer/orders/${order.value.id}/prepare-payment`,
    {
      method: 'POST',

      headers: {
        'X-Trace-Id':
          checkoutTraceId,
      },
    },
  )

  await refresh()

  showSuccess({
    title: 'Order Ready for Payment',
    message:
      `Order ${order.value?.orderNo ?? ''} is ready for payment.`,
    primaryLabel: 'Continue',
  })
  }
  catch (error: unknown) {
    const message =
      getApiErrorMessage(
        error,
        'Unable to prepare order for payment.',
      )

    showError({
      title: 'Payment Preparation Failed',
      message,
      primaryLabel: 'OK',
    })
  }
  finally {
    preparingPayment.value = false
  }
}

async function simulatePayment() {
  if (!order.value) {
    return
  }

  simulatingPayment.value = true

  try {
      const checkoutTraceId =
        getOrCreateTraceId(
          order.value.id,
        )

      await $csrfFetch(
        `/api/customer/orders/${order.value.id}/simulate-payment`,
        {
          method: 'POST',

          headers: {
            'X-Trace-Id':
              checkoutTraceId,

            'Idempotency-Key':
              `BREWHUB-TEST-PAYMENT-ORDER-${order.value.id}`,
          },
        },
      )

    showSuccess({
      title: 'Payment Completed',
      message:
        `Test payment for order ${order.value?.orderNo ?? ''} completed successfully.`,
      primaryLabel: 'Done',
      })

    await refresh()
  }
  catch (error: unknown) {
  const message =
    getApiErrorMessage(
      error,
      'Unable to complete test payment.',
    )

  showError({
    title: 'Payment Failed',
    message,
    primaryLabel: 'OK',
  })
}
  finally {
    simulatingPayment.value = false
  }
}

async function simulatePaymentTimeout() {
  if (!order.value) {
    return
  }

  simulatingPayment.value = true

  try {
    const checkoutTraceId =
      getOrCreateTraceId(
        order.value.id,
      )

    await $csrfFetch(
      `/api/customer/orders/${order.value.id}/simulate-payment?simulateTimeout=true`,
      {
        method: 'POST',

        headers: {
          'X-Trace-Id':
            checkoutTraceId,

          /*
           * Timeout simulation is a
           * different logical request
           * from successful payment.
           */
          'Idempotency-Key':
            `BREWHUB-TEST-PAYMENT-TIMEOUT-ORDER-${order.value.id}`,
        },
      },
    )

    await refresh()

    showWarning({
      title:
        'Payment Being Verified',

      message:
        'The payment provider did not return a final result. BrewHub will keep this order pending while the payment is verified.',

      primaryLabel:
        'OK',
    })
  }
  catch (error: unknown) {
    const message =
      getApiErrorMessage(
        error,
        'Unable to simulate payment timeout.',
      )

    showError({
      title:
        'Timeout Simulation Failed',

      message,

      primaryLabel:
        'OK',
    })
  }
  finally {
    simulatingPayment.value = false
  }
}

async function submitCancellation() {
  if (!order.value) {
    return
  }

    if (
    order.value.paymentState
    === 'VERIFYING'
  ) {
    showWarning({
      title:
        'Payment Being Verified',

      message:
        'This order cannot be cancelled while the payment result is still being verified.',

      primaryLabel:
        'OK',
    })

    return
  }

  const reason =
    cancellationReason.value.trim()

  if (reason.length < 3) {
  showWarning({
    title: 'Cancellation Reason Required',
    message:
      'Please enter a cancellation reason before cancelling this order.',
    primaryLabel: 'OK',
  })

  return
}

  const confirmed =
  await showConfirm({
    title: 'Cancel This Order?',
    message:
      `Order ${order.value.orderNo} will be cancelled.\n`
      + `Reason: ${reason}\n\n`
      + 'This action cannot be undone.',
    primaryLabel: 'Cancel Order',
    secondaryLabel: 'Keep Order',
    dismissible: true,
    closeOnBackdrop: false,
  })

  if (!confirmed) {
    return
  }

  cancellingOrder.value = true

  try {
    await $csrfFetch(
      `/api/customer/orders/${order.value.id}/cancel`,
      {
        method: 'POST',

        body: {
          reason,
        },
      },
    )

    cancellationReason.value = ''
    showCancelForm.value = false

    await refresh()

    showSuccess({
      title: 'Order Cancelled',
      message:
        `Order ${order.value?.orderNo ?? ''} was cancelled successfully.`,
      primaryLabel: 'Done',
})
  }
  catch (error: unknown) {
  const message =
    getApiErrorMessage(
      error,
      'Unable to cancel order.',
    )

  showError({
    title: 'Cancellation Failed',
    message:
      message,
    primaryLabel: 'OK',
  })
}
  finally {
    cancellingOrder.value = false
  }
}

async function retryOrder() {
  await refresh()
}

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

function getApiErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error !== 'object'
    || error === null
  ) {
    return fallback
  }

  if (
    'data' in error
    && typeof error.data === 'object'
    && error.data !== null
    && 'statusMessage' in error.data
    && typeof error.data.statusMessage
      === 'string'
  ) {
    return error.data.statusMessage
  }

  if (
    'statusMessage' in error
    && typeof error.statusMessage
      === 'string'
  ) {
    return error.statusMessage
  }

  return fallback
}
</script>

<template>
  <main
    class="
      mx-auto
      w-full max-w-5xl
      px-4 sm:px-6 py-12
      lg:px-8
    "
  >
    <!-- BACK -->
    <NuxtLink
      to="/account/orders"
      class="
        inline-flex
        text-sm font-semibold
        text-brew-600
        transition
        hover:text-brew-950
      "
    >
      ← Back to my orders
    </NuxtLink>

    <!-- LOADING -->
    <template
      v-if="
        pending
        && !order
      "
    >
        <!-- ORDER HEADER SKELETON -->
        <section
          class="
            mt-8
            rounded-3xl
            border border-brew-100
            bg-white
            p-4
            shadow-sm
            sm:p-8
          "
          aria-hidden="true"
        >
          <div
            class="
              flex flex-col
              gap-5
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div class="flex-1">
              <AppSkeleton class="h-3 w-28" />

              <AppSkeleton
                class="
                  mt-3
                  h-8
                  w-44
                "
              />

              <AppSkeleton
                class="
                  mt-4
                  h-4
                  w-48
                "
              />
            </div>

            <AppSkeleton
              class="
                h-10
                w-28
                rounded-full
              "
            />
          </div>

          <div
            class="
              mt-7
              grid gap-4
              border-t border-brew-100
              pt-6
              sm:grid-cols-2
            "
          >
            <div>
              <AppSkeleton class="h-3 w-20" />
              <AppSkeleton class="mt-2 h-5 w-24" />
            </div>

            <div>
              <AppSkeleton class="h-3 w-16" />
              <AppSkeleton class="mt-2 h-5 w-32" />
            </div>
          </div>
        </section>

        <!-- ITEMS SKELETON -->
        <section
          class="
            mt-6
            overflow-hidden
            rounded-3xl
            border border-brew-100
            bg-white
            shadow-sm
          "
          aria-hidden="true"
        >
          <div
            class="
              border-b border-brew-100
              px-6 py-5
              sm:px-8
            "
          >
            <AppSkeleton class="h-6 w-28" />
          </div>

          <article
            v-for="index in 3"
            :key="index"
            class="
              flex flex-col
              gap-4
              border-b border-brew-100
              px-6 py-5
              last:border-b-0
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-8
            "
          >
            <div class="flex-1">
              <AppSkeleton class="h-5 w-40" />
              <AppSkeleton class="mt-2 h-3 w-24" />
              <AppSkeleton class="mt-3 h-4 w-32" />
            </div>

            <AppSkeleton class="h-6 w-24" />
          </article>
        </section>

        <!-- TOTALS SKELETON -->
        <section
          class="
            mt-6
            ml-auto
            max-w-md
            rounded-3xl
            border border-brew-100
            bg-white
            p-4
            shadow-sm
            sm:p-6
          "
          aria-hidden="true"
        >
          <div class="space-y-4">
            <div
              v-for="index in 3"
              :key="index"
              class="
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <AppSkeleton class="h-4 w-20" />
              <AppSkeleton class="h-4 w-24" />
            </div>

            <div
              class="
                flex
                items-center
                justify-between
                gap-4
                border-t border-brew-100
                pt-4
              "
            >
              <AppSkeleton class="h-5 w-16" />
              <AppSkeleton class="h-8 w-28" />
            </div>
          </div>
        </section>
      </template>

    <!-- ERROR -->
    <AppStatePanel
      v-else-if="error"
      class="mt-8"
      variant="error"
      title="Unable to load this order"
      message="
        BrewHub could not retrieve this
        order. Please try again.
      "
    >
      <button
        type="button"
        class="
          mt-5
          rounded-xl
          border border-red-200
          px-4 py-2
          text-sm font-semibold
          text-red-700
          transition
          hover:bg-red-100
        "
        @click="retryOrder"
      >
        Try again
      </button>
    </AppStatePanel>

    <template v-else-if="order">
      <!-- ORDER HEADER -->
      <section
        class="
          mt-8
          rounded-3xl
          border border-brew-100
          bg-white
          p-4
          shadow-sm
          sm:p-8
        "
      >
        <div
          class="
            flex flex-col
            gap-5
            sm:flex-row
            sm:items-start
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
              BrewHub Order
            </p>

            <h1
              class="
                mt-2
                text-2xl font-semibold
                tracking-tight
                text-brew-950
                sm:text-3xl
              "
            >
              {{ order.orderNo }}
            </h1>

            <p
              class="
                mt-3
                text-sm
                text-brew-500
              "
            >
              {{
                formatDate(
                  order.createdAt,
                )
              }}
            </p>
          </div>

          <span
            class="
              w-fit
              rounded-full
              px-4 py-2
              text-sm font-semibold
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
            mt-7
            grid gap-4
            border-t border-brew-100
            pt-6
            sm:grid-cols-2
          "
        >
          <div>
            <p
              class="
                text-xs uppercase
                tracking-wider
                text-brew-400
              "
            >
              Order type
            </p>

            <p
              class="
                mt-1
                font-semibold
                text-brew-900
              "
            >
              {{
                formatOrderType(
                  order.orderType,
                )
              }}
            </p>
          </div>

          <div>
            <p
              class="
                text-xs uppercase
                tracking-wider
                text-brew-400
              "
            >
              Source
            </p>

            <p
              class="
                mt-1
                font-semibold
                text-brew-900
              "
            >
              {{
                order.source === 'CUSTOMER'
                  ? 'Online customer'
                  : order.source
              }}
            </p>
          </div>
        </div>
      </section>

      <!-- ITEMS -->
      <section
        class="
          mt-6
          overflow-hidden
          rounded-3xl
          border border-brew-100
          bg-white
          shadow-sm
        "
      >
        <div
          class="
            border-b border-brew-100
            px-6 py-5
            sm:px-8
          "
        >
          <h2
            class="
              text-lg font-semibold
              text-brew-950
            "
          >
            Order items
          </h2>
        </div>

        <article
          v-for="item in order.items"
          :key="item.id"
          class="
            flex flex-col
            gap-4
            border-b border-brew-100
            px-6 py-5
            last:border-b-0
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-8
          "
        >
          <div>
            <h3
              class="
                font-semibold
                text-brew-950
              "
            >
              {{
                item.productNameSnapshot
              }}
            </h3>

            <p
              class="
                mt-1
                text-xs
                uppercase
                tracking-wider
                text-brew-400
              "
            >
              {{ item.skuSnapshot }}
            </p>

            <p
              class="
                mt-2
                text-sm
                text-brew-500
              "
            >
              {{
                item.quantity
              }}
              ×
              {{
                formatPrice(
                  item.unitPrice,
                )
              }}
            </p>
          </div>

          <p
            class="
              text-lg font-semibold
              text-brew-950
            "
          >
            {{
              formatPrice(
                item.lineTotal,
              )
            }}
          </p>
        </article>
      </section>

      <!-- TOTALS -->
      <section
        class="
          mt-6
          ml-auto
          max-w-md
          rounded-3xl
          border border-brew-100
          bg-white
          p-4 sm:p-6
          shadow-sm
        "
      >
        <div
          class="
            space-y-3
            text-sm
          "
        >
          <div
            class="
              flex flex-wrap justify-between gap-x-4 gap-y-2
              text-brew-600
            "
          >
            <span>Subtotal</span>

            <span>
              {{
                formatPrice(
                  order.subtotal,
                )
              }}
            </span>
          </div>

          <div
            class="
              flex flex-wrap justify-between gap-x-4 gap-y-2
              text-brew-600
            "
          >
            <span>Discount</span>

            <span>
              −{{
                formatPrice(
                  order.discountAmount,
                )
              }}
            </span>
          </div>

          <div
            class="
              flex flex-wrap justify-between gap-x-4 gap-y-2
              text-brew-600
            "
          >
            <span>Tax</span>

            <span>
              {{
                formatPrice(
                  order.taxAmount,
                )
              }}
            </span>
          </div>

          <div
            class="
              flex flex-wrap items-center
              justify-between gap-x-4 gap-y-2
              border-t border-brew-100
              pt-4
            "
          >
            <span
              class="
                font-semibold
                text-brew-950
              "
            >
              Total
            </span>

            <strong
              class="
                text-2xl
                text-brew-950
              "
            >
              {{
                formatPrice(
                  order.totalAmount,
                )
              }}
            </strong>
          </div>
        </div>
      </section>

       <!-- CHECKOUT ACTIONS -->
      <section
        v-if="
          order.status === 'DRAFT'
          || order.status === 'PENDING_PAYMENT'
          || order.status === 'COMPLETED'
        "
        class="
          mt-6
          rounded-3xl
          border border-brew-100
          bg-white
          p-4
          shadow-sm
          sm:p-8
        "
      >

        <!-- DRAFT -->
        <template
          v-if="order.status === 'DRAFT'"
        >
          <h2
            class="
              text-lg font-semibold
              text-brew-950
            "
          >
            Ready to continue?
          </h2>

          <p
            class="
              mt-2
              text-sm leading-6
              text-brew-500
            "
          >
            Continue to reserve your
            selected items and prepare
            this order for payment.
          </p>

          <button
            type="button"
            :disabled="preparingPayment"
            :aria-busy="preparingPayment"
            class="
              mt-5
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              px-5 py-3
              text-sm font-semibold
              text-white
              shadow-sm
              transition
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
            style="
              background-color:
                var(--color-brew-800);
            "
            @click="preparePayment"
          >
            <span
              v-if="preparingPayment"
              class="
                size-4
                animate-spin
                rounded-full
                border-2
                border-white/40
                border-t-white
              "
              aria-hidden="true"
            />

            {{
              preparingPayment
                ? 'Preparing payment...'
                : 'Proceed to Payment'
            }}
          </button>
        </template>

        <!-- PENDING PAYMENT -->
        <template
          v-else-if="
            order.status
            === 'PENDING_PAYMENT'
          "
        >
          <div
            v-if="
              order.paymentState
              === 'VERIFYING'
            "
            class="
              rounded-2xl
              border border-amber-200
              bg-amber-50
              p-5
            "
            role="status"
            aria-live="polite"
          >
            <h2
              class="
                font-semibold
                text-amber-900
              "
            >
              Payment is being verified
            </h2>

            <p
              class="
                mt-2
                text-sm leading-6
                text-amber-800
              "
            >
              The payment provider did not
              return a final result. Your
              order is still pending while
              BrewHub verifies the payment.
              Please do not submit another
              payment.
            </p>
          </div>

          <template v-else>
            <h2
              class="
                text-lg font-semibold
                text-brew-950
              "
            >
              Awaiting payment
            </h2>

            <p
              class="
                mt-2
                text-sm leading-6
                text-brew-500
              "
            >
              Your items are currently
              reserved while this order
              waits for payment.
            </p>
          </template>

          <!-- Development payment simulator -->
          <div
            v-if="
              isDevelopment
              && order.paymentState
                !== 'VERIFYING'
            "
            class="
              mt-5
              rounded-2xl
              border border-amber-200
              bg-amber-50
              p-4
            "
          >
            <p
              class="
                text-xs font-semibold
                uppercase
                tracking-wider
                text-amber-800
              "
            >
              Development only
            </p>

            <p
              class="
                mt-2
                text-sm
                text-amber-800
              "
            >
              Use the test payment
              simulator to complete the
              checkout workflow locally.
            </p>

            <button
              type="button"
              :disabled="simulatingPayment"
              :aria-busy="simulatingPayment"
              class="
                mt-4
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                px-5 py-3
                text-sm font-semibold
                text-white
                shadow-sm
                transition
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              style="
                background-color:
                  var(--color-brew-800);
              "
              @click="simulatePayment"
            >
              <span
                v-if="simulatingPayment"
                class="
                  size-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/40
                  border-t-white
                "
                aria-hidden="true"
              />

              {{
                simulatingPayment
                  ? 'Processing payment...'
                  : 'Complete Test Payment'
              }}
            </button>
            <button
              type="button"
              :disabled="simulatingPayment"
              :aria-busy="simulatingPayment"
              class="
                mt-3
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border border-amber-700
                px-5 py-3
                text-sm font-semibold
                text-amber-800
                transition
                hover:bg-amber-100
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              @click="simulatePaymentTimeout"
            >
              Simulate Payment Timeout
            </button>
          </div>

          <p
            v-else-if="
              order.paymentState
              !== 'VERIFYING'
              "
            class="
              mt-5
              rounded-2xl
              bg-brew-50
              p-4
              text-sm
              text-brew-600
            "
          >
            Online payment integration
            is not configured yet.
          </p>
        </template>

        <!-- COMPLETED -->
        <template
          v-else-if="
            order.status === 'COMPLETED'
          "
        >
          <div
            class="
              rounded-2xl
              border border-green-200
              bg-green-50
              p-5
            "
          >
            <div
              class="
                flex
                items-start
                gap-3
              "
            >
              <div
                class="
                  flex
                  size-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-green-100
                  text-green-700
                "
                aria-hidden="true"
              >
                ✓
              </div>

              <div>
                <h2
                  class="
                    font-semibold
                    text-green-800
                  "
                >
                  Payment confirmed
                </h2>

                <p
                  class="
                    mt-2
                    text-sm leading-6
                    text-green-700
                  "
                >
                  Your payment was successful and
                  this BrewHub order is complete.
                </p>

                <p
                  v-if="order.completedAt"
                  class="
                    mt-2
                    text-xs
                    text-green-700
                  "
                >
                  Completed
                  {{
                    formatDate(
                      order.completedAt,
                    )
                  }}
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="isDevelopment"
            class="
              mt-5
              rounded-2xl
              border
              border-amber-200
              bg-amber-50
              p-5
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-amber-800
              "
            >
              TESDA Idempotency Test
            </p>

            <p
              class="
                mt-2
                text-sm
                leading-6
                text-amber-800
              "
            >
              Retry the exact same completed checkout
              request using the same Idempotency-Key.
              The stored result should be replayed
              without creating another payment or
              deducting inventory again.
            </p>

            <button
              type="button"
              :disabled="simulatingPayment"
              class="
                mt-4
                rounded-xl
                border
                border-amber-700
                bg-amber-700
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-amber-800
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              @click="simulatePayment"
            >
              {{
                simulatingPayment
                  ? 'Retrying Same Request...'
                  : 'TESDA: Retry Same Checkout Request'
              }}
            </button>
          </div>

        </template>

        <!-- CANCEL ORDER -->
        <div
          v-if="
            (
              order.status === 'DRAFT'
              || order.status === 'PENDING_PAYMENT'
            )
            && order.paymentState !== 'VERIFYING'
            "
          class="
            mt-6
            border-t border-brew-100
            pt-6
          "
        >
          <button
            v-if="!showCancelForm"
            type="button"
            class="
              text-sm font-semibold
              text-red-700
              transition
              hover:text-red-900
            "
            @click="
              showCancelForm = true
            "
          >
            Cancel order
          </button>

          <div
            v-else
            class="
              rounded-2xl
              border border-red-200
              bg-red-50
              p-5
            "
          >
            <h3
              class="
                font-semibold
                text-red-800
              "
            >
              Cancel this order?
            </h3>

            <p
              class="
                mt-2
                text-sm leading-6
                text-red-700
              "
            >
              Please provide a reason for
              cancelling this order.
            </p>

            <label
              class="mt-4 block"
            >
              <span
                class="
                  text-sm font-medium
                  text-red-800
                "
              >
                Cancellation reason
              </span>

              <textarea
                v-model="cancellationReason"
                rows="3"
                maxlength="500"
                placeholder="e.g. I changed my mind"
                class="
                  mt-2
                  w-full
                  rounded-xl
                  border border-red-200
                  bg-white
                  px-3.5 py-2.5
                  text-stone-900
                  outline-none
                  transition
                  focus:border-red-500
                "
              />
            </label>

            <div
              class="
                mt-4
                flex flex-wrap
                gap-3
              "
            >
              <button
                type="button"
                :disabled="cancellingOrder"
                class="
                  rounded-xl
                  bg-red-700
                  px-5 py-2.5
                  text-sm font-semibold
                  text-white
                  transition
                  hover:bg-red-800
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
                @click="submitCancellation"
              >
                {{
                  cancellingOrder
                    ? 'Cancelling...'
                    : 'Confirm Cancellation'
                }}
              </button>

              <button
                type="button"
                :disabled="cancellingOrder"
                class="
                  rounded-xl
                  border border-red-200
                  bg-white
                  px-5 py-2.5
                  text-sm font-semibold
                  text-red-700
                  transition
                  hover:bg-red-100
                  disabled:opacity-60
                "
                @click="
                  showCancelForm = false;
                  cancellationReason = ''
                "
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>