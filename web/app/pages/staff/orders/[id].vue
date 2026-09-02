<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'cashier',
  ],
})

const {
  isManager,
} = useAccountAccess()

interface OrderDetails {
  order: {
    id: number
    orderNo: string
    branchId: number
    customerId: number | null
    createdByUserId: number
    source: 'CUSTOMER' | 'POS'
    orderType: 'DINE_IN' | 'TAKEOUT'
    status:
      | 'DRAFT'
      | 'PENDING_PAYMENT'
      | 'PAID'
      | 'COMPLETED'
      | 'CANCELLED'
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    version: number
    createdAt: string
    updatedAt: string
    completedAt: string | null
    cancelledAt: string | null
    cancellationReason: string | null
  }

  items: Array<{
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
  }>

  payments: Array<{
    id: number
    orderId: number
    transactionType: string
    parentPaymentId: number | null
    method: string
    provider: string
    providerReference: string | null
    amount: number
    status: string
    failureCode: string | null
    failureMessage: string | null
    createdAt: string
    updatedAt: string
    processedAt: string | null
  }>

  reservations: Array<{
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
  }>

  stockMovements: Array<{
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
  }>
}

interface StaffOrderDetailsResponse {
  details: OrderDetails
}

const route =
  useRoute()

const orderId =
  Number(
    route.params.id,
  )

const {
  data,
  pending,
  error,
  refresh,
} =
  await useFetch<StaffOrderDetailsResponse>(
    `/api/staff/orders/${orderId}`,
  )

const details =
  computed(
    () => data.value?.details,
  )

const cancellationReason =
  ref('')

const cancelling =
  ref(false)

const cancelError =
  ref('')

const refunding =
  ref(false)

const refundError =
  ref('')

const refundSuccess =
  ref(false)

const simulatingDatabaseFailure =
  ref(false)

const databaseFailureMessage =
  ref('')

const databaseRollbackResult =
  ref<{
    rolledBack: boolean
    beforeVersion: number
    afterVersion: number
    beforeStatus: string
    afterStatus: string
    traceId: string
  } | null>(null)

const isDevelopment =
  import.meta.dev

const hasSuccessfulPayment =
  computed(() =>
    details.value?.payments.some(
      payment =>
        payment.transactionType
          === 'PAYMENT'
        && payment.status
          === 'SUCCEEDED',
    ) ?? false,
  )

const hasSuccessfulRefund =
  computed(() =>
    details.value?.payments.some(
      payment =>
        payment.transactionType
          === 'REFUND'
        && payment.status
          === 'SUCCEEDED',
    ) ?? false,
  )

const canRefund =
  computed(() =>
    isManager.value
    && details.value?.order.status
      === 'COMPLETED'
    && hasSuccessfulPayment.value
    && !hasSuccessfulRefund.value,
  )

const cancelSuccess =
  ref(false)

const canCancel =
  computed(() => {
    const status =
      details.value?.order.status

    return (
      status === 'DRAFT'
      || status === 'PENDING_PAYMENT'
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
  value: string | null,
) {
  if (!value) {
    return '—'
  }

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

function statusClass(
  status: string,
) {
  switch (status) {
    case 'COMPLETED':
    case 'SUCCEEDED':
    case 'CONSUMED':
      return `
        border-green-200
        bg-green-50
        text-green-700
      `

    case 'PENDING_PAYMENT':
    case 'PENDING':
    case 'ACTIVE':
      return `
        border-amber-200
        bg-amber-50
        text-amber-700
      `

    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
      return `
        border-red-200
        bg-red-50
        text-red-700
      `

    default:
      return `
        border-brew-200
        bg-brew-50
        text-brew-700
      `
  }
}

async function refreshDetails() {
  await refresh()
}

async function refundSelectedOrder() {
  refundError.value = ''
  refundSuccess.value = false

  const confirmed =
    window.confirm(
      'Issue a full refund for this completed order?',
    )

  if (!confirmed) {
    return
  }

  refunding.value = true

  try {
    await $fetch(
      `/api/manager/orders/${orderId}/refund`,
      {
        method: 'POST',
      },
    )

    refundSuccess.value = true

    await refresh()
  }
  catch (error) {
    refundError.value =
      error instanceof Error
        ? error.message
        : 'Unable to refund the order.'
  }
  finally {
    refunding.value = false
  }
}

async function cancelSelectedOrder() {
  const reason =
    cancellationReason.value.trim()

  cancelError.value = ''
  cancelSuccess.value = false

  if (reason.length < 3) {
    cancelError.value =
      'Please enter a cancellation reason.'

    return
  }

  const confirmed =
    window.confirm(
      'Are you sure you want to cancel this order?',
    )

  if (!confirmed) {
    return
  }

  cancelling.value = true

  try {
    await $fetch(
      `/api/staff/orders/${orderId}/cancel`,
      {
        method: 'POST',

        body: {
          reason,
        },
      },
    )

    cancellationReason.value = ''
    cancelSuccess.value = true

    await refresh()
  }
  catch (error) {
    cancelError.value =
      error instanceof Error
        ? error.message
        : 'Unable to cancel the order.'
  }
  finally {
    cancelling.value = false
  }
}

async function simulateDatabaseFailure() {
  databaseFailureMessage.value = ''
  databaseRollbackResult.value = null
  simulatingDatabaseFailure.value = true

  try {
    /*
     * A successful HTTP response would be
     * unexpected because this TESDA test
     * intentionally returns HTTP 503.
     */
    await $fetch(
      `/api/staff/orders/${orderId}/simulate-database-failure`,
      {
        method:
          'POST',
      },
    )

    databaseFailureMessage.value =
      'Expected database failure did not occur.'
  }
  catch (error: unknown) {
    const fetchError =
      error as {
        data?: {
          statusMessage?: string

          data?: {
            rolledBack?: boolean
            beforeVersion?: number
            afterVersion?: number
            beforeStatus?: string
            afterStatus?: string
            traceId?: string
          }
        }
      }

    const result =
      fetchError.data?.data

    if (
      result?.rolledBack === true
      && typeof result.beforeVersion
        === 'number'
      && typeof result.afterVersion
        === 'number'
      && typeof result.beforeStatus
        === 'string'
      && typeof result.afterStatus
        === 'string'
      && typeof result.traceId
        === 'string'
    ) {
      databaseFailureMessage.value =
        fetchError.data?.statusMessage
        ?? 'Unable to process'

      databaseRollbackResult.value = {
        rolledBack:
          true,

        beforeVersion:
          result.beforeVersion,

        afterVersion:
          result.afterVersion,

        beforeStatus:
          result.beforeStatus,

        afterStatus:
          result.afterStatus,

        traceId:
          result.traceId,
      }

      return
    }

    databaseFailureMessage.value =
      error instanceof Error
        ? error.message
        : 'Unable to process'
  }
  finally {
    simulatingDatabaseFailure.value =
      false
  }
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
          to="/staff/orders"
          class="
            text-sm
            font-semibold
            text-brew-600
            hover:text-brew-900
          "
        >
          ← Back to Recent Orders
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
          Order Details
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
          {{
            details?.order.orderNo
              ?? 'Order'
          }}
        </h1>
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
          hover:bg-brew-50
          disabled:opacity-60
        "
        @click="refreshDetails"
      >
        {{
          pending
            ? 'Refreshing...'
            : 'Refresh'
        }}
      </button>
    </div>

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
      Loading order details...
    </div>

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
      Unable to load this order.
    </div>

    <template v-else-if="details">

      <div
        v-if="cancelSuccess"
        class="
          mt-8
          rounded-2xl
          border
          border-green-200
          bg-green-50
          p-4
          text-sm
          font-medium
          text-green-700
        "
      >
        Order cancelled successfully.
      </div>

      <div
        v-if="refundSuccess"
        class="
          mt-8
          rounded-2xl
          border
          border-green-200
          bg-green-50
          p-4
          text-sm
          font-medium
          text-green-700
        "
      >
        Full refund completed successfully.
      </div>

      <!-- ORDER SUMMARY -->
      <div
        class="
          mt-8
          grid
          gap-5
          lg:grid-cols-3
        "
      >
        <div
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-6
            shadow-sm
            lg:col-span-2
          "
        >
          <div
            class="
              flex
              flex-wrap
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                class="
                  text-sm
                  text-brew-500
                "
              >
                Order status
              </p>

              <span
                class="
                  mt-2
                  inline-flex
                  rounded-full
                  border
                  px-3
                  py-1
                  text-xs
                  font-semibold
                "
                :class="
                  statusClass(
                    details.order.status,
                  )
                "
              >
                {{
                  formatLabel(
                    details.order.status,
                  )
                }}
              </span>
            </div>

            <div class="text-right">
              <p
                class="
                  text-sm
                  text-brew-500
                "
              >
                Total
              </p>

              <p
                class="
                  mt-1
                  text-3xl
                  font-semibold
                  text-brew-950
                "
              >
                {{
                  formatMoney(
                    details.order.totalAmount,
                  )
                }}
              </p>
            </div>
          </div>

          <div
            class="
              mt-8
              grid
              gap-5
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            <div>
              <p class="text-xs text-brew-500">
                Source
              </p>

              <p class="mt-1 font-medium text-brew-900">
                {{
                  formatLabel(
                    details.order.source,
                  )
                }}
              </p>
            </div>

            <div>
              <p class="text-xs text-brew-500">
                Order Type
              </p>

              <p class="mt-1 font-medium text-brew-900">
                {{
                  formatLabel(
                    details.order.orderType,
                  )
                }}
              </p>
            </div>

            <div>
              <p class="text-xs text-brew-500">
                Created
              </p>

              <p class="mt-1 font-medium text-brew-900">
                {{
                  formatDate(
                    details.order.createdAt,
                  )
                }}
              </p>
            </div>

            <div>
              <p class="text-xs text-brew-500">
                Created By User
              </p>

              <p class="mt-1 font-medium text-brew-900">
                #{{ details.order.createdByUserId }}
              </p>
            </div>
          </div>

          <div
            v-if="
              details.order.status
                === 'CANCELLED'
            "
            class="
              mt-6
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-4
            "
          >
            <p
              class="
                text-sm
                font-semibold
                text-red-800
              "
            >
              Cancellation
            </p>

            <p
              class="
                mt-2
                text-sm
                text-red-700
              "
            >
              {{
                details.order
                  .cancellationReason
                  || 'No reason recorded.'
              }}
            </p>

            <p
              class="
                mt-2
                text-xs
                text-red-600
              "
            >
              {{
                formatDate(
                  details.order.cancelledAt,
                )
              }}
            </p>
          </div>
        </div>

        <!-- TOTAL BREAKDOWN -->
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
          <h2
            class="
              text-lg
              font-semibold
              text-brew-950
            "
          >
            Total Breakdown
          </h2>

          <div
            class="
              mt-5
              space-y-3
              text-sm
            "
          >
            <div class="flex justify-between">
              <span class="text-brew-500">
                Subtotal
              </span>

              <span class="font-medium text-brew-900">
                {{
                  formatMoney(
                    details.order.subtotal,
                  )
                }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-brew-500">
                Discount
              </span>

              <span class="font-medium text-brew-900">
                {{
                  formatMoney(
                    details.order.discountAmount,
                  )
                }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-brew-500">
                Tax
              </span>

              <span class="font-medium text-brew-900">
                {{
                  formatMoney(
                    details.order.taxAmount,
                  )
                }}
              </span>
            </div>

            <div
              class="
                flex
                justify-between
                border-t
                border-brew-100
                pt-3
              "
            >
              <span class="font-semibold text-brew-950">
                Total
              </span>

              <span class="font-semibold text-brew-950">
                {{
                  formatMoney(
                    details.order.totalAmount,
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- STAFF CANCELLATION -->
        <div
          v-if="canCancel"
          class="
            mt-6
            rounded-3xl
            border
            border-red-200
            bg-white
            p-6
            shadow-sm
          "
        >
          <div
            class="
              max-w-2xl
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.16em]
                text-red-500
              "
            >
              Staff Action
            </p>
          
            <h2
              class="
                mt-2
                text-xl
                font-semibold
                text-brew-950
              "
            >
              Cancel Order
            </h2>
          
            <p
              class="
                mt-2
                text-sm
                leading-6
                text-brew-500
              "
            >
              This action cancels the order.
              Any active inventory reservations
              will be released automatically.
            </p>
          
            <label
              class="
                mt-5
                block
              "
            >
              <span
                class="
                  text-sm
                  font-medium
                  text-brew-800
                "
              >
                Cancellation reason
              </span>
            
              <textarea
                v-model="cancellationReason"
                rows="3"
                maxlength="500"
                :disabled="cancelling"
                placeholder="Enter the reason for cancellation"
                class="
                  mt-2
                  w-full
                  resize-y
                  rounded-xl
                  border
                  border-brew-200
                  bg-white
                  px-4
                  py-3
                  text-brew-950
                  outline-none
                  transition
                  focus:border-red-400
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />
            </label>
          
            <p
              v-if="cancelError"
              class="
                mt-3
                text-sm
                font-medium
                text-red-600
              "
            >
              {{ cancelError }}
            </p>
          
            <div
              class="
                mt-5
                flex
                items-center
                gap-4
              "
            >
              <button
                type="button"
                :disabled="
                  cancelling
                  || cancellationReason
                    .trim()
                    .length < 3
                "
                class="
                  rounded-xl
                  border
                  border-red-700
                  bg-red-700
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-red-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                @click="cancelSelectedOrder"
              >
                {{
                  cancelling
                    ? 'Cancelling...'
                    : 'Cancel Order'
                }}
              </button>
            
              <span
                class="
                  text-xs
                  text-brew-500
                "
              >
                A reason is required.
              </span>
            </div>
          </div>
        </div>

        <!-- MANAGER REFUND -->

        <!-- TESDA DATABASE FAILURE TEST -->
        <div
          v-if="isDevelopment"
          class="
            mt-6
            rounded-3xl
            border
            border-red-200
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
              tracking-[0.16em]
              text-red-700
            "
          >
            TESDA Failure Test
          </p>
        
          <h2
            class="
              mt-2
              text-xl
              font-semibold
              text-brew-950
            "
          >
            Database Transaction Rollback
          </h2>
        
          <p
            class="
              mt-2
              text-sm
              leading-6
              text-brew-500
            "
          >
            Simulates a PostgreSQL failure inside
            a transaction and verifies that the
            temporary order change is rolled back.
          </p>
        
          <button
            type="button"
            :disabled="
              simulatingDatabaseFailure
            "
            class="
              mt-5
              rounded-xl
              border
              border-red-700
              bg-red-700
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-red-800
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            @click="
              simulateDatabaseFailure
            "
          >
            {{
              simulatingDatabaseFailure
                ? 'Simulating Database Failure...'
                : 'TESDA: Simulate Database Failure'
            }}
          </button>
        
          <div
            v-if="databaseFailureMessage"
            class="
              mt-5
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-4
            "
          >
            <p
              class="
                font-semibold
                text-red-800
              "
            >
              {{ databaseFailureMessage }}
            </p>
          
            <div
              v-if="databaseRollbackResult"
              class="
                mt-3
                space-y-1
                text-sm
                text-red-700
              "
            >
              <p>
                Transaction rolled back:
                <strong>
                  {{
                    databaseRollbackResult
                      .rolledBack
                      ? 'YES'
                      : 'NO'
                  }}
                </strong>
              </p>
            
              <p>
                Version before:
                {{ databaseRollbackResult.beforeVersion }}
              </p>
            
              <p>
                Version after:
                {{ databaseRollbackResult.afterVersion }}
              </p>
            
              <p>
                Status before:
                {{ databaseRollbackResult.beforeStatus }}
              </p>
            
              <p>
                Status after:
                {{ databaseRollbackResult.afterStatus }}
              </p>
            
              <p class="break-all">
                Trace ID:
                {{ databaseRollbackResult.traceId }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-if="canRefund"
          class="
            mt-6
            rounded-3xl
            border
            border-amber-200
            bg-white
            p-6
            shadow-sm
          "
        >
          <div class="max-w-2xl">
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.16em]
                text-amber-700
              "
            >
              Manager Action
            </p>
          
            <h2
              class="
                mt-2
                text-xl
                font-semibold
                text-brew-950
              "
            >
              Full Refund
            </h2>
          
            <p
              class="
                mt-2
                text-sm
                leading-6
                text-brew-500
              "
            >
              Refund the full successful payment
              for this completed order.
              Inventory will not be restocked
              automatically.
            </p>
          
            <p
              v-if="refundError"
              class="
                mt-4
                text-sm
                font-medium
                text-red-600
              "
            >
              {{ refundError }}
            </p>
          
            <div class="mt-5">
              <button
                type="button"
                :disabled="refunding"
                class="
                  rounded-xl
                  border
                  border-amber-700
                  bg-amber-700
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-amber-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                @click="refundSelectedOrder"
              >
                {{
                  refunding
                    ? 'Refunding...'
                    : 'Issue Full Refund'
                }}
              </button>
            </div>
          </div>
        </div>

      <!-- ITEMS -->
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
        <h2
          class="
            text-xl
            font-semibold
            text-brew-950
          "
        >
          Order Items
        </h2>

        <div
          class="
            mt-5
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

                <th class="py-3 pr-5">
                  Unit Price
                </th>

                <th class="py-3">
                  Line Total
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
                v-for="item in details.items"
                :key="item.id"
              >
                <td
                  class="
                    py-4
                    pr-5
                    font-medium
                    text-brew-950
                  "
                >
                  {{
                    item.productNameSnapshot
                  }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-sm
                    text-brew-500
                  "
                >
                  {{ item.skuSnapshot }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-brew-700
                  "
                >
                  {{ item.quantity }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-brew-700
                  "
                >
                  {{
                    formatMoney(
                      item.unitPrice,
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
                      item.lineTotal,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAYMENTS -->
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
        <h2
          class="
            text-xl
            font-semibold
            text-brew-950
          "
        >
          Payments
        </h2>

        <p
          v-if="details.payments.length === 0"
          class="
            mt-4
            text-sm
            text-brew-500
          "
        >
          No payment records for this order.
        </p>

        <div
          v-else
          class="
            mt-5
            grid
            gap-4
          "
        >
          <div
            v-for="payment in details.payments"
            :key="payment.id"
            class="
              rounded-2xl
              border
              border-brew-100
              p-5
            "
          >
            <div
              class="
                flex
                flex-wrap
                items-start
                justify-between
                gap-4
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
                      payment.transactionType,
                    )
                  }}
                  ·
                  {{ payment.method }}
                </p>

                <p
                  class="
                    mt-1
                    text-sm
                    text-brew-500
                  "
                >
                  {{ payment.provider }}
                </p>
              </div>

              <div class="text-right">
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
                    statusClass(
                      payment.status,
                    )
                  "
                >
                  {{
                    formatLabel(
                      payment.status,
                    )
                  }}
                </span>

                <p
                  class="
                    mt-2
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

            <div
              class="
                mt-4
                text-xs
                text-brew-500
              "
            >
              <p>
                Reference:
                {{
                  payment.providerReference
                    || '—'
                }}
              </p>

              <p class="mt-1">
                Processed:
                {{
                  formatDate(
                    payment.processedAt,
                  )
                }}
              </p>
            </div>

            <div
              v-if="
                payment.failureCode
                || payment.failureMessage
              "
              class="
                mt-4
                rounded-xl
                bg-red-50
                p-3
                text-sm
                text-red-700
              "
            >
              {{
                payment.failureCode
                  || 'Payment failure'
              }}

              <span
                v-if="payment.failureMessage"
              >
                —
                {{ payment.failureMessage }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- RESERVATIONS -->
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
        <h2
          class="
            text-xl
            font-semibold
            text-brew-950
          "
        >
          Inventory Reservations
        </h2>

        <p
          v-if="
            details.reservations.length
              === 0
          "
          class="
            mt-4
            text-sm
            text-brew-500
          "
        >
          No inventory reservations were recorded.
        </p>

        <div
          v-else
          class="
            mt-5
            grid
            gap-4
            md:grid-cols-2
          "
        >
          <div
            v-for="
              reservation
              in details.reservations
            "
            :key="reservation.id"
            class="
              rounded-2xl
              border
              border-brew-100
              p-5
            "
          >
            <div
              class="
                flex
                items-start
                justify-between
                gap-4
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
                    reservation.productName
                  }}
                </p>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-500
                  "
                >
                  {{ reservation.sku }}
                </p>
              </div>

              <span
                class="
                  rounded-full
                  border
                  px-3
                  py-1
                  text-xs
                  font-semibold
                "
                :class="
                  statusClass(
                    reservation.status,
                  )
                "
              >
                {{
                  formatLabel(
                    reservation.status,
                  )
                }}
              </span>
            </div>

            <p
              class="
                mt-4
                text-sm
                text-brew-600
              "
            >
              Quantity:
              <strong>
                {{ reservation.quantity }}
              </strong>
            </p>

            <p
              class="
                mt-2
                text-xs
                text-brew-500
              "
            >
              Expires:
              {{
                formatDate(
                  reservation.expiresAt,
                )
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- STOCK MOVEMENTS -->
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
        <h2
          class="
            text-xl
            font-semibold
            text-brew-950
          "
        >
          Stock Movements
        </h2>

        <p
          v-if="
            details.stockMovements.length
              === 0
          "
          class="
            mt-4
            text-sm
            text-brew-500
          "
        >
          No stock movements for this order.
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
              min-w-225
              text-left
            "
          >
            <thead
              class="
                border-b
                border-brew-200
                text-xs
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
                  Movement
                </th>

                <th class="py-3 pr-5">
                  On Hand Δ
                </th>

                <th class="py-3 pr-5">
                  Reserved Δ
                </th>

                <th class="py-3 pr-5">
                  After
                </th>

                <th class="py-3">
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
                  movement
                  in details.stockMovements
                "
                :key="movement.id"
              >
                <td class="py-4 pr-5">
                  <p
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      movement.productName
                    }}
                  </p>

                  <p
                    class="
                      mt-1
                      text-xs
                      text-brew-500
                    "
                  >
                    {{ movement.sku }}
                  </p>
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    font-medium
                    text-brew-700
                  "
                >
                  {{
                    formatLabel(
                      movement.movementType,
                    )
                  }}
                </td>

                <td class="py-4 pr-5">
                  {{ movement.onHandDelta }}
                </td>

                <td class="py-4 pr-5">
                  {{ movement.reservedDelta }}
                </td>

                <td
                  class="
                    py-4
                    pr-5
                    text-sm
                    text-brew-600
                  "
                >
                  On hand:
                  {{ movement.onHandAfter }}

                  <br>

                  Reserved:
                  {{ movement.reservedAfter }}
                </td>

                <td
                  class="
                    py-4
                    text-sm
                    text-brew-500
                  "
                >
                  {{
                    formatDate(
                      movement.createdAt,
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