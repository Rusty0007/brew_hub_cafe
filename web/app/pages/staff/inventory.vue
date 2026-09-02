<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})

interface InventoryItem {
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

interface InventoryResponse {
  inventory: InventoryItem[]
}

interface StockMovement {
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

interface StockMovementResponse {
  movements: StockMovement[]
}

interface StaffProduct {
  id: number
  sku: string
  name: string
  trackInventory: boolean
  isActive: boolean

  category: {
    id: number
    name: string
  }
}

interface StaffProductsResponse {
  products: StaffProduct[]

  requestedBy: {
    id: number
    username: string
  }
}

const branchId = 1

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<InventoryResponse>(
  '/api/manager/inventory',
  {
    query: {
      branchId,
    },
  },
)

const inventory = computed(
  () => data.value?.inventory ?? [],
)

const {
  data: productData,
  pending: productPending,
  error: productError,
} = await useFetch<StaffProductsResponse>(
  '/api/staff/catalog/products',
)

const productOptions = computed(
  () =>
    productData.value?.products.filter(
      product =>
        product.isActive
        && product.trackInventory,
    ) ?? [],
)

const {
  data: movementData,
  pending: movementPending,
  error: movementError,
  refresh: refreshMovements,
} = await useFetch<StockMovementResponse>(
  '/api/manager/inventory/movements',
  {
    query: {
      branchId,
      limit: 50,
    },
  },
)

const movements = computed(
  () =>
    movementData.value?.movements
    ?? [],
)

/*
 *  Receive Stock UI state
 */
const showReceiveForm = ref(false)

const receiveForm = reactive({
  productId: 0,
  quantity: 1,
  reference: '',
  reason: 'Stock received',
})

const receiving = ref(false)
const receiveError = ref('')
const receiveSuccess = ref('')

// Adjust Stock UI state

const showAdjustForm = ref(false)

const adjustForm = reactive({
  productId: 0,
  delta: 1,
  reason: '',
})

const adjusting = ref(false)
const adjustError = ref('')
const adjustSuccess = ref('')

watch(
  productOptions,
  (products) => {
    const firstProduct =
      products[0]

    if (!firstProduct) {
      return
    }

    const receiveProductExists =
      products.some(
        product =>
          product.id
          === receiveForm.productId,
      )

    if (!receiveProductExists) {
      receiveForm.productId =
        firstProduct.id
    }

    const adjustProductExists =
      products.some(
        product =>
          product.id
          === adjustForm.productId,
      )

    if (!adjustProductExists) {
      adjustForm.productId =
        firstProduct.id
    }
  },
  {
    immediate: true,
  },
)

async function submitAdjustStock() {
  adjustError.value = ''
  adjustSuccess.value = ''

  if (
    !Number.isInteger(adjustForm.productId)
    || adjustForm.productId <= 0
  ) {
    adjustError.value =
      'Enter a valid product ID.'

    return
  }

  if (
    !Number.isFinite(adjustForm.delta)
    || adjustForm.delta === 0
  ) {
    adjustError.value =
      'Adjustment must be non-zero.'

    return
  }

  if (!adjustForm.reason.trim()) {
    adjustError.value =
      'Adjustment reason is required.'

    return
  }

  adjusting.value = true

  try {
    await $fetch(
      '/api/manager/inventory/adjust',
      {
        method: 'POST',

        body: {
          branchId,

          productId:
            adjustForm.productId,

          delta:
            adjustForm.delta,

          reason:
            adjustForm.reason.trim(),
        },
      },
    )

    adjustSuccess.value =
      'Stock adjusted successfully.'

    adjustForm.delta = 1
    adjustForm.reason = ''

    await refreshInventory()
  }
  catch (error: unknown) {
    adjustError.value =
      getApiErrorMessage(
        error,
        'Unable to adjust stock.',
      )
  }
  finally {
    adjusting.value = false
  }
}

async function submitReceiveStock() {
  receiveError.value = ''
  receiveSuccess.value = ''

  if (
    !Number.isInteger(
      receiveForm.productId,
    )
    || receiveForm.productId <= 0
  ) {
    receiveError.value =
      'Enter a valid product ID.'

    return
  }

  if (
    !Number.isFinite(
      receiveForm.quantity,
    )
    || receiveForm.quantity <= 0
  ) {
    receiveError.value =
      'Quantity must be greater than zero.'

    return
  }

  receiving.value = true

  try {
    await $fetch(
      '/api/manager/inventory/receive',
      {
        method: 'POST',

        body: {
          branchId,

          productId:
            receiveForm.productId,

          quantity:
            receiveForm.quantity,

          reference:
            receiveForm.reference.trim()
            || null,

          reason:
            receiveForm.reason.trim()
            || 'Stock received',
        },
      },
    )

    receiveSuccess.value =
      'Stock received successfully.'

    receiveForm.quantity = 1
    receiveForm.reference = ''
    receiveForm.reason =
      'Stock received'

    await refreshInventory()
  }
  catch (error: unknown) {
    receiveError.value =
      getApiErrorMessage(
        error,
        'Unable to receive stock.',
      )
  }
  finally {
    receiving.value = false
  }
}

async function refreshInventory() {
  await Promise.all([
    refresh(),
    refreshMovements(),
  ])
}

function formatQuantity(
  quantity: number,
) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      maximumFractionDigits: 3,
    },
  ).format(quantity)
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

function movementLabel(
  movementType: string,
) {
  const labels: Record<
    string,
    string
  > = {
    RECEIPT: 'Received',
    ADJUSTMENT: 'Adjusted',
    RESERVE: 'Reserved',
    RELEASE: 'Released',
    EXPIRE_RELEASE:
      'Reservation expired',
    SALE: 'Sold',
  }

  return labels[movementType]
    ?? movementType
}

function movementClasses(
  movementType: string,
) {
  switch (movementType) {
    case 'RECEIPT':
      return 'bg-emerald-50 text-emerald-700'

    case 'ADJUSTMENT':
      return 'bg-amber-50 text-amber-700'

    case 'RESERVE':
      return 'bg-blue-50 text-blue-700'

    case 'RELEASE':
    case 'EXPIRE_RELEASE':
      return 'bg-stone-100 text-stone-700'

    case 'SALE':
      return 'bg-violet-50 text-violet-700'

    default:
      return 'bg-stone-100 text-stone-700'
  }
}

function formatDelta(
  value: number,
) {
  if (value > 0) {
    return `+${formatQuantity(value)}`
  }

  return formatQuantity(value)
}

function stockStatus(
  item: InventoryItem,
) {
  if (item.availableQty <= 0) {
    return 'Out of stock'
  }

  if (
    item.availableQty
    <= item.reorderLevel
  ) {
    return 'Low stock'
  }

  return 'In stock'
}

function stockStatusClasses(
  item: InventoryItem,
) {
  if (item.availableQty <= 0) {
    return 'bg-red-50 text-red-700'
  }

  if (
    item.availableQty
    <= item.reorderLevel
  ) {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-emerald-50 text-emerald-700'
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
  <section
    class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
  >
    <!-- Page header -->
    <div
      class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800"
        >
          Stock
        </p>

        <h1
          class="mt-2 text-3xl font-semibold text-stone-900"
        >
          Inventory
        </h1>

        <p
          class="mt-2 max-w-2xl text-sm leading-6 text-stone-600"
        >
          Review current stock,
          reservations, and available
          quantities for BrewHub.
        </p>
      </div>

      <div
          class="flex flex-wrap gap-3"
        >

            <NuxtLink
                to="/staff/manager"
                class="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
              >
                Back to Workspace
              </NuxtLink>

          <!-- RECEIVE STOCK BUTTON -->
          <button
            type="button"
            class="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition"
            style="background-color: var(--color-brew-800);"
            @click="
              showReceiveForm =
                !showReceiveForm
            "
          >
            {{
              showReceiveForm
                ? 'Close'
                : 'Receive Stock'
            }}
          </button>
      
          <!-- ADJUST STOCK BUTTON -->
          <button
            type="button"
            class="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
            @click="
              showAdjustForm =
                !showAdjustForm
            "
          >
            {{
              showAdjustForm
                ? 'Close Adjustment'
                : 'Adjust Stock'
            }}
          </button>
      
          <!-- REFRESH BUTTON -->
          <button
            type="button"
            class="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="pending"
            @click="refreshInventory"
          >
            {{
              pending
                ? 'Refreshing...'
                : 'Refresh'
            }}
          </button>
        </div>
    </div>

    <!-- Receive Stock panel -->
    <div
      v-if="showReceiveForm"
      class="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div class="mb-6">
        <h2
          class="text-lg font-semibold text-stone-900"
        >
          Receive Stock
        </h2>

        <p
          class="mt-1 text-sm text-stone-600"
        >
          Record newly delivered stock
          for the BrewHub branch.
        </p>
      </div>

      <form
        class="grid gap-5 sm:grid-cols-2"
        @submit.prevent="
          submitReceiveStock
        "
      >
        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Product
          </span>
      
          <select
            v-model.number="
              receiveForm.productId
            "
            required
            :disabled="
              productPending
              || productOptions.length === 0
            "
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option
              value="0"
              disabled
            >
              Select a product
            </option>
        
            <option
              v-for="product in productOptions"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }} — {{ product.sku }}
            </option>
          </select>
      
          <p
            v-if="productError"
            class="mt-2 text-xs text-red-700"
          >
            Unable to load products.
          </p>
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Quantity
          </span>

          <input
            v-model.number="
              receiveForm.quantity
            "
            type="number"
            min="0.001"
            step="0.001"
            required
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700"
          >
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Reference
          </span>

          <input
            v-model="
              receiveForm.reference
            "
            type="text"
            maxlength="120"
            placeholder="e.g. DELIVERY-2026-001"
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700"
          >
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Reason
          </span>

          <input
            v-model="
              receiveForm.reason
            "
            type="text"
            maxlength="500"
            required
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700"
          >
        </label>

        <div
          class="sm:col-span-2"
        >
          <p
            v-if="receiveError"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ receiveError }}
          </p>

          <p
            v-if="receiveSuccess"
            class="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {{ receiveSuccess }}
          </p>

          <button
            type="submit"
            :disabled="receiving"
            class="rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            style="background-color: var(--color-brew-800);"
          >
            {{
              receiving
                ? 'Receiving...'
                : 'Receive Stock'
            }}
          </button>
        </div>
      </form>
    </div>

    <!-- Adjust Stock panel -->
    <div
      v-if="showAdjustForm"
      class="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div class="mb-6">
        <h2
          class="text-lg font-semibold text-stone-900"
        >
          Adjust Stock
        </h2>

        <p
          class="mt-1 text-sm text-stone-600"
        >
          Correct inventory quantities with
          a documented reason.
        </p>
      </div>

      <form
        class="grid gap-5 sm:grid-cols-2"
        @submit.prevent="submitAdjustStock"
      >
        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Product
          </span>
      
          <select
            v-model.number="
              adjustForm.productId
            "
            required
            :disabled="
              productPending
              || productOptions.length === 0
            "
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option
              value="0"
              disabled
            >
              Select a product
            </option>
        
            <option
              v-for="product in productOptions"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }} — {{ product.sku }}
            </option>
          </select>
      
          <p
            v-if="productError"
            class="mt-2 text-xs text-red-700"
          >
            Unable to load products.
          </p>
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-stone-700"
          >
            Adjustment
          </span>

          <input
            v-model.number="adjustForm.delta"
            type="number"
            step="0.001"
            required
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700"
          >

          <p
            class="mt-1 text-xs text-stone-500"
          >
            Positive adds stock. Negative removes stock.
          </p>
        </label>

        <label
          class="block sm:col-span-2"
        >
          <span
            class="text-sm font-medium text-stone-700"
          >
            Reason
          </span>

          <textarea
            v-model="adjustForm.reason"
            required
            maxlength="500"
            rows="3"
            placeholder="Explain why the stock quantity is being adjusted."
            class="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 outline-none transition focus:border-amber-700"
          ></textarea>
        </label>

        <div
          class="sm:col-span-2"
        >
          <p
            v-if="adjustError"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ adjustError }}
          </p>

          <p
            v-if="adjustSuccess"
            class="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {{ adjustSuccess }}
          </p>

          <button
            type="submit"
            :disabled="adjusting"
            class="rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            style="background-color: var(--color-brew-800);"
          >
            {{
              adjusting
                ? 'Adjusting...'
                : 'Apply Adjustment'
            }}
          </button>
        </div>
      </form>
    </div>

    <!-- Loading -->
    <div
      v-if="pending"
      class="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500"
    >
      Loading inventory...
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 p-6"
    >
      <p
        class="font-medium text-red-800"
      >
        Unable to load inventory.
      </p>

      <p
        class="mt-1 text-sm text-red-700"
      >
        Please try again.
      </p>
    </div>

    <!-- Empty -->
    <div
      v-else-if="inventory.length === 0"
      class="rounded-2xl border border-stone-200 bg-white p-10 text-center"
    >
      <h2
        class="text-lg font-semibold text-stone-900"
      >
        No inventory records yet
      </h2>

      <p
        class="mt-2 text-sm text-stone-600"
      >
        Inventory records are created
        when stock is first received.
      </p>
        </div>

        <!-- Inventory table -->
    <div
      v-else
      class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
    >
      <div class="overflow-x-auto">
        <table
          class="w-full text-left"
          style="min-width: 900px"
        >
          <thead
            class="border-b border-stone-200 bg-stone-50"
          >
            <tr>
              <th
                class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Product
              </th>

              <th
                class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                On hand
              </th>

              <th
                class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Reserved
              </th>

              <th
                class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Available
              </th>

              <th
                class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Reorder level
              </th>

              <th
                class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Status
              </th>

              <th
                class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Updated
              </th>
            </tr>
          </thead>

          <tbody
            class="divide-y divide-stone-100"
          >
            <tr
              v-for="item in inventory"
              :key="item.id"
              class="transition hover:bg-stone-50/70"
            >
              <td class="px-5 py-4">
                <p
                  class="font-medium text-stone-900"
                >
                  {{ item.productName }}
                </p>

                <p
                  class="mt-0.5 text-xs text-stone-500"
                >
                  {{ item.sku }}
                </p>
              </td>

              <td
                class="px-5 py-4 text-right font-medium text-stone-800"
              >
                {{
                  formatQuantity(
                    item.onHandQty,
                  )
                }}
              </td>

              <td
                class="px-5 py-4 text-right text-stone-600"
              >
                {{
                  formatQuantity(
                    item.reservedQty,
                  )
                }}
              </td>

              <td
                class="px-5 py-4 text-right font-semibold text-stone-900"
              >
                {{
                  formatQuantity(
                    item.availableQty,
                  )
                }}
              </td>

              <td
                class="px-5 py-4 text-right text-stone-600"
              >
                {{
                  formatQuantity(
                    item.reorderLevel,
                  )
                }}
              </td>

              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="
                    stockStatusClasses(
                      item,
                    )
                  "
                >
                  {{
                    stockStatus(
                      item,
                    )
                  }}
                </span>
              </td>

              <td
                class="px-5 py-4 text-sm text-stone-500"
              >
                {{
                  formatDate(
                    item.updatedAt,
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Stock Movement History -->
    <div
      class="mt-10"
    >
      <div class="mb-5">
        <h2
          class="text-xl font-semibold text-stone-900"
        >
          Stock Movement History
        </h2>

        <p
          class="mt-1 text-sm text-stone-600"
        >
          Recent receipts, adjustments,
          reservations, releases, and sales.
        </p>
      </div>

      <!-- Movement loading -->
      <div
        v-if="movementPending"
        class="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500"
      >
        Loading stock movements...
      </div>

      <!-- Movement error -->
      <div
        v-else-if="movementError"
        class="rounded-2xl border border-red-200 bg-red-50 p-6"
      >
        <p
          class="font-medium text-red-800"
        >
          Unable to load stock movements.
        </p>

        <p
          class="mt-1 text-sm text-red-700"
        >
          Please try again.
        </p>
      </div>

      <!-- No movements -->
      <div
        v-else-if="movements.length === 0"
        class="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500"
      >
        No stock movements yet.
      </div>

      <!-- Movement table -->
      <div
        v-else
        class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      >
        <div class="overflow-x-auto">
          <table
            class="w-full text-left"
            style="min-width: 1050px"
          >
            <thead
              class="border-b border-stone-200 bg-stone-50"
            >
              <tr>
                <th
                  class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Date
                </th>

                <th
                  class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Product
                </th>

                <th
                  class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Type
                </th>

                <th
                  class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  On-hand change
                </th>

                <th
                  class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Reserved change
                </th>

                <th
                  class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  On hand after
                </th>

                <th
                  class="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Reference / reason
                </th>
              </tr>
            </thead>

            <tbody
              class="divide-y divide-stone-100"
            >
              <tr
                v-for="movement in movements"
                :key="movement.id"
                class="transition hover:bg-stone-50/70"
              >
                <td
                  class="px-5 py-4 text-sm text-stone-500"
                >
                  {{
                    formatDate(
                      movement.createdAt,
                    )
                  }}
                </td>

                <td class="px-5 py-4">
                  <p
                    class="font-medium text-stone-900"
                  >
                    {{ movement.productName }}
                  </p>

                  <p
                    class="mt-0.5 text-xs text-stone-500"
                  >
                    {{ movement.sku }}
                  </p>
                </td>

                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="
                      movementClasses(
                        movement.movementType,
                      )
                    "
                  >
                    {{
                      movementLabel(
                        movement.movementType,
                      )
                    }}
                  </span>
                </td>

                <td
                  class="px-5 py-4 text-right font-medium text-stone-800"
                >
                  {{
                    formatDelta(
                      movement.onHandDelta,
                    )
                  }}
                </td>

                <td
                  class="px-5 py-4 text-right text-stone-600"
                >
                  {{
                    formatDelta(
                      movement.reservedDelta,
                    )
                  }}
                </td>

                <td
                  class="px-5 py-4 text-right font-medium text-stone-800"
                >
                  {{
                    formatQuantity(
                      movement.onHandAfter,
                    )
                  }}
                </td>

                <td class="px-5 py-4">
                  <p
                    v-if="movement.reference"
                    class="text-sm font-medium text-stone-800"
                  >
                    {{ movement.reference }}
                  </p>

                  <p
                    v-if="movement.reason"
                    class="mt-1 text-sm text-stone-500"
                  >
                    {{ movement.reason }}
                  </p>

                  <p
                    v-if="
                      !movement.reference
                      && !movement.reason
                    "
                    class="text-sm text-stone-400"
                  >
                    —
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </section>
</template>