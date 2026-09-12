<script setup lang="ts">

const {
  $csrfFetch,
} = useNuxtApp()

const {
  showConfirm,
  showSuccess,
  showError,
  showWarning,
} = useAppModal()

definePageMeta({
  middleware: [
    'auth',
    'cashier',
  ],
})

interface CatalogProduct {
  id: number
  categoryId: number | null
  sku: string
  name: string
  basePrice: string | number
  isActive: boolean
  trackInventory: boolean
}

interface CatalogCategory {
  id: number
  name: string
  isActive: boolean
}

interface ProductsResponse {
  data: CatalogProduct[]

  meta: {
    count: number
    total: number
    limit: number
    offset: number
    categoryId: number | null
    search: string | null
  }
}

interface CategoriesResponse {
  data: CatalogCategory[]

  meta: {
    count: number
    limit: number
  }
}

interface PosCustomer {
  id: number
  customerNo: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  isActive: boolean
}

interface CustomerSearchResponse {
  customers: PosCustomer[]
}

interface PosLine {
  productId: number
  sku: string
  name: string
  unitPrice: number
  quantity: number
}

type PosOrderType =
  | 'DINE_IN'
  | 'TAKEOUT'
  | 'PICKUP'
  | 'DELIVERY'

interface CreatedPosOrder {
  id: number
  orderNo: string
  source: string
  orderType: PosOrderType
  status: string
  totalAmount: number

  paymentState:
    | 'VERIFYING'
    | null
}

interface CreatePosOrderResponse {
  message: string
  order: CreatedPosOrder
}

const searchInput =
  ref('')

const appliedSearch =
  ref('')

const selectedCategoryId =
  ref('')

const customerSearchInput =
  ref('')

const customerSearchResults =
  ref<PosCustomer[]>([])

const selectedCustomer =
  ref<PosCustomer | null>(
    null,
  )

const searchingCustomers =
  ref(false)

const customerSearchError =
  ref('')

const posLines =
  ref<PosLine[]>([])

const orderType =
  ref<PosOrderType>(
    'TAKEOUT',
  )

const creatingOrder =
  ref(false)

const preparingPayment =
  ref(false)

const completingPayment =
  ref(false)

const simulatingPaymentTimeout =
  ref(false)

const isDevelopment =
  import.meta.dev


const createdOrder =
  ref<CreatedPosOrder | null>(
    null,
  )

const createdOrderItemCount =
  ref(0)

const productQuery =
  computed(() => {
    const query: {
      limit: number
      offset: number
      categoryId?: number
      search?: string
    } = {
      limit: 100,
      offset: 0,
    }

    if (
      selectedCategoryId.value
    ) {
      query.categoryId =
        Number(
          selectedCategoryId.value,
        )
    }

    if (
      appliedSearch.value
    ) {
      query.search =
        appliedSearch.value
    }

    return query
  })

const {
  data: categoriesResponse,
  pending: categoriesPending,
  error: categoriesError,
  refresh: refreshCategories,
} = await useFetch<CategoriesResponse>(
  '/api/catalog/categories',
)

const {
  data: productsResponse,
  pending: productsPending,
  error: productsError,
  refresh: refreshProducts,
} = await useFetch<ProductsResponse>(
  '/api/catalog/products',
  {
    query:
      productQuery,
  },
)

const categories =
  computed(
    () =>
      categoriesResponse.value
        ?.data
      ?? [],
  )

const products =
  computed(
    () =>
      productsResponse.value
        ?.data
      ?? [],
  )

const categoryMap =
  computed(
    () =>
      new Map(
        categories.value.map(
          category => [
            category.id,
            category.name,
          ],
        ),
      ),
  )

const totalItems =
  computed(
    () =>
      posLines.value.reduce(
        (
          total,
          line,
        ) =>
          total
          + line.quantity,
        0,
      ),
  )

const subtotal =
  computed(
    () =>
      posLines.value.reduce(
        (
          total,
          line,
        ) =>
          total
          + (
            line.unitPrice
            * line.quantity
          ),
        0,
      ),
  )

const pesoFormatter =
  new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  )

function formatMoney(
  value: number,
) {
  return pesoFormatter.format(
    value,
  )
}

function getProductPrice(
  product: CatalogProduct,
) {
  const price =
    Number(
      product.basePrice,
    )

  return Number.isFinite(price)
    ? price
    : 0
}

function getCategoryName(
  categoryId: number | null,
) {
  if (!categoryId) {
    return 'Uncategorized'
  }

  return categoryMap.value.get(
    categoryId,
  ) ?? 'Uncategorized'
}

async function addProduct(
  product: CatalogProduct,
) {

  if (createdOrder.value) {
    showWarning({
      title:
        'Finish Current Order',

      message:
        'Complete or finish the current POS order before adding products to a new order.',

      primaryLabel:
        'OK',
    })

    return
  }

  const startedAtMs =
    performance.now()

  const existing =
    posLines.value.find(
      line =>
        line.productId
        === product.id,
    )

  if (existing) {
    existing.quantity += 1
  }
  else {
    posLines.value.push({
      productId:
        product.id,

      sku:
        product.sku,

      name:
        product.name,

      unitPrice:
        getProductPrice(
          product,
        ),

      quantity: 1,
    })
  }

  /*
   * Wait for Vue's reactive state
   * update before ending the logical
   * Add Item measurement.
   */
  await nextTick()

  const durationMs =
    Number(
      (
        performance.now()
        - startedAtMs
      ).toFixed(
        2,
      ),
    )

  /*
 * Telemetry transmission happens
 * after the measured operation.
 *
 * Do not wait for telemetry because
 * observability must not delay the
 * POS Add Item interaction.
 */
void $csrfFetch(
  '/api/observability/client-performance',
  {
    method: 'POST',

    body: {
      operation:
        'ordering.add_item',

      durationMs,

      source:
        'POS',

      result:
        'success',

      metadata: {
        productId:
          product.id,

        existingLine:
          Boolean(
            existing,
          ),
      },
    },
  },
)
  .catch(
    (error) => {
      console.error(
        'Add Item performance telemetry failed:',
        error,
      )
    },
  )
  }

function increaseQuantity(
  productId: number,
) {

  if (createdOrder.value) {
    return
  }

  const line =
    posLines.value.find(
      item =>
        item.productId
        === productId,
    )

  if (!line) {
    return
  }

  line.quantity += 1
}

function decreaseQuantity(
  productId: number,
) {

  if (createdOrder.value) {
    return
  }

  const line =
    posLines.value.find(
      item =>
        item.productId
        === productId,
    )

  if (!line) {
    return
  }

  if (line.quantity <= 1) {
    removeLine(
      productId,
    )

    return
  }

  line.quantity -= 1
}

function removeLine(
  productId: number,
) {
  if (createdOrder.value) {
    return
  }

  posLines.value =
    posLines.value.filter(
      line =>
        line.productId
        !== productId,
    )
}

async function clearOrder() {
  if (createdOrder.value) {
    return
  }

  if (posLines.value.length === 0) {
    return
  }

  const confirmed =
    await showConfirm({
      title: 'Clear POS Order?',
      message:
        `${totalItems.value} item${totalItems.value === 1 ? '' : 's'} will be removed.\n`
        + `Current subtotal: ${formatMoney(subtotal.value)}\n\n`
        + 'This will clear the cashier\'s current order.',
      primaryLabel: 'Clear Order',
      secondaryLabel: 'Keep Order',
      dismissible: true,
      closeOnBackdrop: false,
    })

  if (!confirmed) {
    return
  }

  posLines.value = []
}

function applySearch() {
  appliedSearch.value =
    searchInput.value.trim()
}

function clearSearch() {
  searchInput.value = ''
  appliedSearch.value = ''
}

async function searchCustomers() {
  const search =
    customerSearchInput.value.trim()

  customerSearchError.value = ''

  if (!search) {
    customerSearchResults.value = []
    return
  }

  searchingCustomers.value = true

  try {
    const response =
      await $fetch<CustomerSearchResponse>(
        '/api/staff/pos/customers',
        {
          query: {
            search,
          },
        },
      )

    customerSearchResults.value =
      response.customers
  }
  catch (error: unknown) {
    customerSearchResults.value = []

    customerSearchError.value =
      getApiErrorMessage(
        error,
        'Unable to search customers.',
      )
  }
  finally {
    searchingCustomers.value = false
  }
}

function selectCustomer(
  customer: PosCustomer,
) {
  selectedCustomer.value =
    customer

  customerSearchInput.value = ''

  customerSearchResults.value = []

  customerSearchError.value = ''
}

function clearSelectedCustomer() {
  selectedCustomer.value = null

  customerSearchInput.value = ''

  customerSearchResults.value = []

  customerSearchError.value = ''
}

function getCustomerName(
  customer: PosCustomer,
) {
  const name = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || 'BrewHub Customer'
}

function clearProductFilters() {
  searchInput.value = ''
  appliedSearch.value = ''
  selectedCategoryId.value = ''
}

function getApiErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error === 'object'
    && error !== null
  ) {
    if (
      'statusMessage' in error
      && typeof (
        error as {
          statusMessage?: unknown
        }
      ).statusMessage === 'string'
    ) {
      return (
        error as {
          statusMessage: string
        }
      ).statusMessage
    }

    if (
      'data' in error
      && typeof (
        error as {
          data?: {
            statusMessage?: unknown
            message?: unknown
          }
        }
      ).data === 'object'
    ) {
      const data =
        (
          error as {
            data?: {
              statusMessage?: unknown
              message?: unknown
            }
          }
        ).data

      if (
        typeof data?.statusMessage
        === 'string'
      ) {
        return data.statusMessage
      }

      if (
        typeof data?.message
        === 'string'
      ) {
        return data.message
      }
    }
  }

  return fallback
}

async function submitPosOrder() {
  if (
  posLines.value.length === 0
) {
  showWarning({
    title: 'No Items in Order',
    message:
      'Add at least one product before creating a POS order.',
    primaryLabel: 'OK',
  })

  return
}


 const orderTypeLabels:
  Record<
    PosOrderType,
    string
  > = {
    DINE_IN:
      'Dine in',

    TAKEOUT:
      'Takeout',

    PICKUP:
      'Pickup',

    DELIVERY:
      'Delivery',
  }

  const orderTypeLabel =
    orderTypeLabels[
      orderType.value
    ]

  const confirmed =
    await showConfirm({
      title: 'Create POS Order?',
      message:
        `${totalItems.value} item${totalItems.value === 1 ? '' : 's'} · ${orderTypeLabel}\n`
        + `Subtotal: ${formatMoney(subtotal.value)}\n\n`
        + 'Confirm the cashier order before creating it.',
      primaryLabel: 'Create Order',
      secondaryLabel: 'Review Order',
      dismissible: true,
      closeOnBackdrop: false,
    })

  if (!confirmed) {
    return
  }

  creatingOrder.value = true

  try {
    const response =
      await $csrfFetch<CreatePosOrderResponse>(
        '/api/staff/pos/orders',
        {
          method: 'POST',

          body: {
            customerId:
              selectedCustomer.value
                ?.id
              ?? null,

            orderType:
              orderType.value,

            items:
              posLines.value.map(
                line => ({
                  productId:
                    line.productId,

                  quantity:
                    line.quantity,
                }),
              ),
          },
        },
      )

    /*
     * Preserve the confirmed item count
     * before clearing the local draft.
     */
    createdOrderItemCount.value =
      totalItems.value

    createdOrder.value =
      response.order

    /*
     * Clear the local draft because
     * it now exists in PostgreSQL.
     */
    posLines.value = []

    /*
     * Customer attribution belongs only
     * to the order that was just created.
     *
     * Reset it immediately so the next
     * POS transaction starts as a guest
     * and cannot inherit the previous
     * customer's account by mistake.
     */
    clearSelectedCustomer()

    showSuccess({
      title: 'POS Order Created',
      message:
        `Order ${response.order.orderNo} was created successfully.\n`
        + `Total: ${formatMoney(response.order.totalAmount)}`,
      primaryLabel: 'Continue',
})
  }
  catch (error: unknown) {
  const message =
    getApiErrorMessage(
      error,
      'Unable to create POS order.',
    )

  showError({
    title: 'POS Order Failed',
    message,
    primaryLabel: 'Review Order',
  })
}
  finally {
    creatingOrder.value = false
  }
}

async function prepareCreatedOrderForPayment() {
  if (!createdOrder.value) {
    return
  }

  preparingPayment.value = true

  try {
    const response =
      await $csrfFetch<{
        message: string
        order: CreatedPosOrder
      }>(
        `/api/staff/pos/orders/${createdOrder.value.id}/prepare-payment`,
        {
          method: 'POST',
        },
      )

    createdOrder.value =
      response.order

  showSuccess({
    title: 'Order Ready for Payment',
    message:
      `Order ${response.order.orderNo} is now ready for payment.`,
    primaryLabel: 'Continue',
    })
  }
  catch (error: unknown) {
    const message =
      getApiErrorMessage(
        error,
        'Unable to prepare POS order for payment.',
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

async function completeCreatedOrderPayment() {
  if (!createdOrder.value) {
    return
  }

  if (
    createdOrder.value.paymentState
    === 'VERIFYING'
  ) {
    showWarning({
      title:
        'Payment Being Verified',

      message:
        'This payment cannot be submitted again while the previous payment result is still being verified.',

      primaryLabel:
        'OK',
    })

    return
  }

  completingPayment.value = true

  try {
    const response =
      await $csrfFetch<{
        message: string

        result: {
          order: CreatedPosOrder
        } | CreatedPosOrder
      }>(
        `/api/staff/pos/orders/${createdOrder.value.id}/complete-payment`,
        {
          method: 'POST',
        },
      )

    /*
     * First successful checkout returns:
     * { order, payment, traceId }
     *
     * An already completed order may
     * return the order itself.
     */
    createdOrder.value =
      'order' in response.result
        ? response.result.order
        : response.result

    showSuccess({
      title: 'Payment Completed',
      message:
        `Payment for order ${createdOrder.value.orderNo} was completed successfully.`,
      primaryLabel: 'Done',
      })
  }
    catch (error: unknown) {
    const message =
      getApiErrorMessage(
        error,
        'Unable to complete POS payment.',
      )

    showError({
      title: 'Payment Failed',
      message,
      primaryLabel: 'OK',
    })
  }
  finally {
    completingPayment.value = false
  }
}

async function simulateCreatedOrderPaymentTimeout() {
  if (!createdOrder.value) {
    return
  }

  simulatingPaymentTimeout.value = true

  try {
    const response =
      await $csrfFetch<{
        message: string

        result: {
          paymentState: string
        }
      }>(
        `/api/staff/pos/orders/${createdOrder.value.id}/complete-payment?simulateTimeout=true`,
        {
          method:
            'POST',
        },
      )

    /*
     * Safety check:
     *
     * Do not show the verification message
     * unless the server explicitly confirms
     * that this was the timeout workflow.
     */
    if (
      response.result.paymentState
      !== 'VERIFYING'
    ) {
      throw new Error(
        'Payment timeout simulation was not confirmed by the server.',
      )
    }

        /*
     * Keep the unresolved payment state
     * in the current POS order.
     *
     * The order remains PENDING_PAYMENT,
     * but another payment attempt must not
     * be allowed while the result is unknown.
     */
    createdOrder.value = {
      ...createdOrder.value,

      paymentState:
        'VERIFYING',
    }

    showWarning({
      title: 'Payment Verification Required',
      message:
        response.message
        || 'The payment result could not be confirmed immediately and is now being verified.',
      primaryLabel: 'OK',
    })
  }
  catch (error: unknown) {
    const message =
      getApiErrorMessage(
        error,
        'Unable to simulate payment timeout.',
      )

    showError({
      title: 'Payment Timeout Test Failed',
      message,
      primaryLabel: 'OK',
    })
  }
  finally {
    simulatingPaymentTimeout.value = false
  }
}

function startNewPosOrder() {
  createdOrder.value = null
  createdOrderItemCount.value = 0
  orderType.value = 'TAKEOUT'
  posLines.value = []
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
          &larr; Back to Cashier Workspace
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
          Point of Sale
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
          New POS Order
        </h1>

        <p
          class="
            mt-3
            max-w-2xl
            leading-7
            text-brew-500
          "
        >
          Select products and build
          the customer's order.
        </p>
      </div>

      <div
        class="
          rounded-2xl
          border
          border-brew-200
          bg-white
          px-5
          py-3
          shadow-sm
        "
      >
        <p
          class="
            text-xs
            font-semibold
            uppercase
            tracking-[0.14em]
            text-brew-400
          "
        >
          Current Order
        </p>

        <p
          class="
            mt-1
            text-lg
            font-semibold
            text-brew-950
          "
        >
          {{
           createdOrder
            ? createdOrderItemCount
            : totalItems
          }}
          {{
            (
              createdOrder
                ? createdOrderItemCount
                : totalItems
            ) === 1
              ? 'item'
              : 'items'
          }}
        </p>
      </div>
    </div>

    <div
      class="
        mt-10
        grid
        gap-8
        lg:grid-cols-[minmax(0,1fr)_24rem]
      "
    >
    <!-- CUSTOMER ATTRIBUTION -->
    <section
      class="
        mt-8
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-5 sm:p-6
        shadow-sm
      "
    >
      <div
        class="
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div>
          <p
            class="
              text-xs
              font-semibold
              uppercase
              tracking-[0.14em]
              text-brew-400
            "
          >
            Customer
          </p>

          <h2
            class="
              mt-2
              text-xl
              font-semibold
              text-brew-950
            "
          >
            {{
              selectedCustomer
                ? getCustomerName(
                    selectedCustomer,
                  )
                : 'Walk-in / Guest'
            }}
          </h2>

          <p
            v-if="!selectedCustomer"
            class="
              mt-2
              text-sm
              leading-6
              text-brew-500
            "
          >
            This order will remain anonymous
            unless an existing BrewHub customer
            is selected.
          </p>

          <div
            v-else
            class="
              mt-2
              space-y-1
              text-sm
              text-brew-500
            "
          >
            <p
              v-if="
                selectedCustomer.customerNo
              "
            >
              Customer No:
              <span
                class="
                  font-medium
                  text-brew-800
                "
              >
                {{
                  selectedCustomer.customerNo
                }}
              </span>
            </p>

            <p
              v-if="
                selectedCustomer.email
              "
            >
              {{
                selectedCustomer.email
              }}
            </p>

            <p
              v-if="
                selectedCustomer.phone
              "
            >
              {{
                selectedCustomer.phone
              }}
            </p>
          </div>
        </div>

        <button
          v-if="selectedCustomer"
          type="button"
          class="
            rounded-xl
            border
            border-brew-200
            px-4
            py-2.5
            text-sm
            font-semibold
            text-brew-700
            transition
            hover:bg-brew-50
          "
          @click="
            clearSelectedCustomer
          "
        >
          Use Walk-in / Guest
        </button>
      </div>

      <form
        v-if="!selectedCustomer"
        class="
          mt-6
          flex
          flex-col
          gap-3
          sm:flex-row
        "
        @submit.prevent="
          searchCustomers
        "
      >
        <input
          v-model.trim="
            customerSearchInput
          "
          type="search"
          maxlength="255"
          autocomplete="off"
          placeholder="Customer No, name, email, or phone"
          class="
            min-w-0
            flex-1
            rounded-xl
            border
            border-brew-200
            bg-brew-50
            px-4
            py-3
            text-brew-950
            outline-none
            transition
            placeholder:text-brew-400
            focus:border-brew-500
          "
        >

        <button
          type="submit"
          :disabled="
            searchingCustomers
            || !customerSearchInput.trim()
          "
          class="
            rounded-xl
            bg-brew-800
            px-5
            py-3
            text-sm
            font-semibold
            text-white
            transition
            hover:bg-brew-900
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {{
            searchingCustomers
              ? 'Searching...'
              : 'Find Customer'
          }}
        </button>
      </form>

      <p
        v-if="
          customerSearchError
        "
        class="
          mt-4
          text-sm
          font-medium
          text-red-600
        "
      >
        {{ customerSearchError }}
      </p>

      <div
        v-if="
          !selectedCustomer
          && customerSearchResults.length
        "
        class="
          mt-5
          divide-y
          divide-brew-100
          overflow-hidden
          rounded-2xl
          border
          border-brew-200
        "
      >
        <button
          v-for="
            customer
            in customerSearchResults
          "
          :key="customer.id"
          type="button"
          class="
            flex
            w-full
            items-start
            justify-between
            gap-4
            bg-white
            px-4
            py-4
            text-left
            transition
            hover:bg-brew-50
          "
          @click="
            selectCustomer(
              customer,
            )
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
                getCustomerName(
                  customer,
                )
              }}
            </p>

            <p
              class="
                mt-1
                text-sm
                text-brew-500
              "
            >
              {{
                customer.customerNo
                ?? 'No customer number'
              }}
            </p>

            <p
              v-if="customer.email"
              class="
                mt-1
                text-sm
                text-brew-400
              "
            >
              {{ customer.email }}
            </p>
          </div>

          <span
            class="
              shrink-0
              text-sm
              font-semibold
              text-brew-700
            "
          >
            Select
          </span>
        </button>
      </div>

      <p
        v-if="
          !selectedCustomer
          && customerSearchInput.trim()
          && !searchingCustomers
          && !customerSearchError
          && customerSearchResults.length
            === 0
        "
        class="
          mt-4
          text-sm
          text-brew-500
        "
      >
        No matching customer selected.
        The order can still continue as
        Walk-in / Guest.
      </p>
    </section>
      <!-- PRODUCT CATALOG -->
      <div>
        <div
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-5
            shadow-sm
          "
        >
          <form
            class="
              grid
              gap-4
              md:grid-cols-2
            "
            @submit.prevent="applySearch"
          >
            <label>
              <span
                class="
                  text-sm
                  font-medium
                  text-brew-800
                "
              >
                Search
              </span>

              <input
                v-model="searchInput"
                type="search"
                placeholder="Product name or SKU"
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
                Category
              </span>

              <select
                v-model="
                  selectedCategoryId
                "
                :disabled="
                  categoriesPending
                "
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
                <option value="">
                  All categories
                </option>

                <option
                  v-for="
                    category
                    in categories
                  "
                  :key="
                    category.id
                  "
                  :value="
                    String(
                      category.id,
                    )
                  "
                >
                  {{ category.name }}
                </option>
              </select>
            </label>

            <div
              class="
                flex flex-wrap items-end gap-2 md:col-span-2
              "
            >
              <button
                type="submit"
                class="
                  rounded-xl
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:opacity-90
                "
                style="
                  background-color:
                    var(--color-brew-800);
                "
              >
                Search
              </button>

              <button
                v-if="
                  posLines.length > 0
                "
                type="button"
                :disabled="
                  Boolean(createdOrder)
                "
                class="
                  text-xs
                  font-semibold
                  text-red-700
                  hover:text-red-900
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                @click="
                  clearOrder
                "
              >
                Clear
              </button>
            </div>
          </form>

          <div
            v-if="categoriesError"
            class="
              mt-4
              flex
              flex-wrap
              items-center
              justify-between
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
            "
            role="alert"
          >
            <p
              class="
                text-sm
                text-red-700
              "
            >
              Unable to load product categories.
            </p>

            <button
              type="button"
              class="
                rounded-lg
                border
                border-red-300
                bg-white
                px-3
                py-1.5
                text-xs
                font-semibold
                text-red-800
                transition
                hover:bg-red-100
              "
              @click="refreshCategories()"
            >
              Retry
            </button>
          </div>
        </div>

        <div
  v-if="productsPending"
          class="
            mt-6
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-3
          "
          role="status"
          aria-label="Loading products"
        >
          <article
            v-for="item in 6"
            :key="item"
            class="
              flex
              flex-col
              rounded-3xl
              border
              border-brew-200
              bg-white
              p-5
              shadow-sm
            "
            aria-hidden="true"
          >
            <div
              class="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div class="min-w-0 flex-1">
                <AppSkeleton
                  class="h-3 w-20"
                />

                <AppSkeleton
                  class="
                    mt-3
                    h-6
                    w-3/4
                  "
                />

                <AppSkeleton
                  class="
                    mt-2
                    h-3
                    w-28
                  "
                />
              </div>

              <AppSkeleton
                class="
                  h-7
                  w-20
                  rounded-full
                "
              />
            </div>

            <div
              class="
                mt-auto
                pt-6
              "
            >
              <AppSkeleton
                class="h-7 w-24"
              />

              <AppSkeleton
                class="
                  mt-4
                  h-10
                  w-full
                  rounded-xl
                "
              />
            </div>
          </article>
        </div>

        <AppStatePanel
          v-else-if="productsError"
          class="mt-6"
          variant="error"
          title="Unable to load products"
          message="
            BrewHub could not load the POS
            product catalog. Check the
            connection and try again.
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
            @click="refreshProducts()"
          >
            Try Again
          </button>
        </AppStatePanel>

        <AppStatePanel
          v-else-if="
            products.length === 0
          "
          class="mt-6"
          title="No products found"
          message="
            No products match the current
            search or category filter.
          "
        >
          <button
            v-if="
              appliedSearch
              || selectedCategoryId
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
              text-brew-800
              transition
              hover:bg-brew-50
            "
            @click="clearProductFilters"
          >
            Clear Filters
          </button>
        </AppStatePanel>

        <div
          v-else
          class="
            mt-6
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-3
          "
        >
          <article
            v-for="
              product in products
            "
            :key="product.id"
            class="
              flex
              flex-col
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
                flex
                items-start
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
                    tracking-[0.12em]
                    text-brew-400
                  "
                >
                  {{
                    getCategoryName(
                      product.categoryId,
                    )
                  }}
                </p>

                <h2
                  class="
                    mt-2
                    text-lg
                    font-semibold
                    text-brew-950
                  "
                >
                  {{ product.name }}
                </h2>

                <p
                  class="
                    mt-1
                    text-xs
                    text-brew-400
                  "
                >
                  SKU:
                  {{ product.sku }}
                </p>
              </div>

              <span
                v-if="
                  product.trackInventory
                "
                class="
                  rounded-full
                  bg-brew-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-brew-600
                "
              >
                Stock item
              </span>
            </div>

            <div
              class="
                mt-auto
                pt-6
              "
            >
              <p
                class="
                  text-xl
                  font-semibold
                  text-brew-950
                "
              >
                {{
                  formatMoney(
                    getProductPrice(
                      product,
                    ),
                  )
                }}
              </p>

              <button
                type="button"
                :disabled="
                  Boolean(createdOrder)
                "
                class="
                  mt-4
                  w-full
                  rounded-xl
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:opacity-90
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
                style="
                  background-color:
                    var(--color-brew-800);
                "
                @click="
                  addProduct(
                    product,
                  )
                "
              >
                {{
                  createdOrder
                    ? 'Finish Current Order'
                    : 'Add to Order'
                }}
              </button>
            </div>
          </article>
        </div>

        <p
          v-if="
            productsResponse
            && productsResponse.meta.total
              > products.length
          "
          class="
            mt-5
            text-center
            text-sm
            text-brew-500
          "
        >
          Showing the first
          {{ products.length }}
          of
          {{
            productsResponse
              .meta.total
          }}
          matching products.
        </p>
      </div>

      <!-- POS ORDER -->
      <aside
        class="lg:self-start"
      >
        <div
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-4 sm:p-6
            shadow-sm

          "
        >
          <div
            class="
              flex flex-wrap items-center justify-between gap-4
            "
          >
            <div>
              <p
                class="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-brew-400
                "
              >
                Current Order
              </p>

              <h2
                class="
                  mt-2
                  text-2xl
                  font-semibold
                  text-brew-950
                "
              >
                Order Summary
              </h2>
            </div>

            <button
              v-if="
                posLines.length > 0
              "
              type="button"
              class="
                text-xs
                font-semibold
                text-red-700
                hover:text-red-900
              "
              @click="
                clearOrder
              "
            >
              Clear
            </button>
          </div>

          <label
              v-if="!createdOrder"
              class="mt-6 block"
            >
              <span
                class="
                  text-sm
                  font-medium
                  text-brew-800
                "
              >
                Order type
              </span>

              <select
                v-model="orderType"
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
                <option value="TAKEOUT">
                  Takeout
                </option>

                <option value="DINE_IN">
                  Dine in
                </option>

                <option value="PICKUP">
                  Pickup
                </option>

                <option value="DELIVERY">
                  Delivery
                </option>
              </select>
            </label>

          <div
            <div
              v-if="
                posLines.length === 0
                && !createdOrder
              "
            class="
              mt-8
              rounded-2xl
              bg-brew-50
              px-5
              py-8
              text-center
            "
          >
            <p
              class="
                font-medium
                text-brew-800
              "
            >
              No items yet
            </p>

            <p
              class="
                mt-2
                text-sm
                leading-6
                text-brew-500
              "
            >
              Select products from
              the catalog to begin
              the POS order.
            </p>
          </div>

          <div
            v-else-if="
            posLines.length > 0
            "
            class="
              mt-6
              space-y-4
            "
          >
            <article
              v-for="
                line in posLines
              "
              :key="
                line.productId
              "
              class="
                border-b
                border-brew-100
                pb-4
                last:border-b-0
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
                  <h3
                    class="
                      font-semibold
                      text-brew-950
                    "
                  >
                    {{ line.name }}
                  </h3>

                  <p
                    class="
                      mt-1
                      text-xs
                      text-brew-400
                    "
                  >
                    {{ line.sku }}
                  </p>
                </div>

                <button
                  type="button"
                  :disabled="
                    Boolean(createdOrder)
                  "
                  class="
                    text-xs
                    font-semibold
                    text-red-700
                    hover:text-red-900
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  @click="
                    removeLine(
                      line.productId,
                    )
                  "
                >
                  Remove
                </button>
              </div>

              <div
                class="
                  mt-4
                  flex flex-wrap items-center justify-between gap-4
                "
              >
                <div
                  class="
                    flex
                    items-center
                    rounded-xl
                    border
                    border-brew-200
                  "
                >
                  <button
                    type="button"
                    :disabled="
                      Boolean(createdOrder)
                    "
                    class="
                      min-w-11
                      px-3
                      py-1.5
                      font-semibold
                      text-brew-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    :aria-label="`Decrease ${line.name}`"
                    @click="
                      decreaseQuantity(
                        line.productId,
                      )
                    "
                  >
                    &minus;
                  </button>

                  <span
                    class="
                      min-w-9
                      text-center
                      text-sm
                      font-semibold
                      text-brew-950
                    "
                  >
                    {{ line.quantity }}
                  </span>

                  <button
                    type="button"
                    :disabled="
                      Boolean(createdOrder)
                    "
                    class="
                      min-w-11
                      px-3
                      py-1.5
                      font-semibold
                      text-brew-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    :aria-label="`Increase ${line.name}`"
                    @click="
                      increaseQuantity(
                        line.productId,
                      )
                    "
                  >
                    +
                  </button>
                </div>

                <p
                  class="
                    font-semibold
                    text-brew-950
                  "
                >
                  {{
                    formatMoney(
                      line.unitPrice
                      * line.quantity,
                    )
                  }}
                </p>
              </div>
            </article>
          </div>

          <div
            class="
              mt-6
              border-t
              border-brew-200
              pt-5
            "
          >
            <div
              class="
                flex flex-wrap items-center justify-between gap-4
              "
            >
              <span
                class="
                  text-sm
                  font-medium
                  text-brew-500
                "
              >
                Items
              </span>

              <span
                class="
                  font-semibold
                  text-brew-950
                "
              >
                {{
                createdOrder
                  ? createdOrderItemCount
                  : totalItems
                }}
              </span>
            </div>

            <div
              class="
                mt-3
                flex flex-wrap items-center justify-between gap-4
              "
            >
              <span
                class="
                  text-base
                  font-semibold
                  text-brew-950
                "
              >
                {{
                  createdOrder
                    ? 'Order Total'
                    : 'Subtotal'
                }}
              </span>

              <span
                class="
                  text-2xl
                  font-semibold
                  text-brew-950
                "
              >
                {{
                formatMoney(
                  createdOrder
                    ? Number(
                        createdOrder.totalAmount,
                      )
                    : subtotal,
                )
                }}
              </span>
            </div>
          </div>

        <div
          v-if="
            posLines.length > 0
            && !createdOrder
          "
          class="mt-6"
        >
          <button
            type="button"
            :disabled="
              creatingOrder
            "
            class="
              w-full
              rounded-xl
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
            style="
              background-color:
                var(--color-brew-800);
            "
            @click="
              submitPosOrder
            "
          >
            {{
              creatingOrder
                ? 'Creating Order...'
                : 'Create POS Order'
            }}
          </button>

          <p
            class="
              mt-3
              text-center
              text-xs
              leading-5
              text-brew-500
            "
          >
            Product prices will be
            validated again by the
            server before the order
            is created.
          </p>
        </div>

        <div
          v-if="createdOrder"
          class="
            mt-6
            rounded-2xl
            border
            border-green-200
            bg-green-50
            p-5
          "
        >
          <p
            class="
              text-xs
              font-semibold
              uppercase
              tracking-[0.14em]
              text-green-700
            "
          >
            {{
              createdOrder.status === 'COMPLETED'
                ? 'Order Completed'
                : createdOrder.status === 'PENDING_PAYMENT'
                  ? (
                      createdOrder.paymentState === 'VERIFYING'
                        ? 'Payment Verification'
                        : 'Payment Pending'
                    )
                  : 'Order Created'
            }}
          </p>

          <h3
            class="
              mt-2
              text-lg
              font-semibold
              text-green-900
            "
          >
            {{ createdOrder.orderNo }}
          </h3>

          <div
            class="
              mt-4
              space-y-2
              text-sm
              text-green-800
            "
          >
            <div
              class="
                flex
                justify-between
                gap-4
              "
            >
              <span>Status</span>

              <strong>
                {{ createdOrder.status }}
              </strong>
            </div>

            <div
              class="
                flex
                justify-between
                gap-4
              "
            >
              <span>Source</span>

              <strong>
                {{ createdOrder.source }}
              </strong>
            </div>

            <div
              class="
                flex
                justify-between
                gap-4
              "
            >
              <span>Order type</span>

              <strong>
                {{
                  createdOrder.orderType
                  === 'DINE_IN'
                    ? 'Dine in'
                    : createdOrder.orderType
                        === 'PICKUP'
                      ? 'Pickup'
                      : createdOrder.orderType
                          === 'DELIVERY'
                        ? 'Delivery'
                        : 'Takeout'
                }}
              </strong>
            </div>

            <div
              class="
                flex
                justify-between
                gap-4
              "
            >
              <span>Items</span>

              <strong>
                {{ createdOrderItemCount }}
              </strong>
            </div>

            <div
              class="
                flex
                justify-between
                gap-4
              "
            >
              <span>Total</span>

              <strong>
                {{
                  formatMoney(
                    Number(
                      createdOrder.totalAmount,
                    ),
                  )
                }}
              </strong>
            </div>
          </div>
          <button
              v-if="
                createdOrder.status === 'DRAFT'
              "
              type="button"
              :disabled="
                preparingPayment
              "
              class="
                mt-5
                w-full
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:opacity-90
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              style="
                background-color:
                  var(--color-brew-800);
              "
              @click="
                prepareCreatedOrderForPayment
              "
            >
              {{
                preparingPayment
                  ? 'Preparing...'
                  : 'Proceed to Payment'
              }}
            </button>

            <div
              v-if="
                createdOrder.status
                === 'PENDING_PAYMENT'
                && createdOrder.paymentState
                  !== 'VERIFYING'
              "
              class="
                mt-5
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
              "
            >
              <p
                class="
                  font-semibold
                  text-amber-900
                "
              >
                Ready for payment
              </p>

              <p
                class="
                  mt-1
                  text-sm
                  leading-6
                  text-amber-700
                "
              >
                Inventory has been reserved.
                The cashier can now collect
                payment.
              </p>
            </div>

            <div
              v-if="
                createdOrder.status
                === 'PENDING_PAYMENT'
                && createdOrder.paymentState
                  === 'VERIFYING'
              "
              class="
                mt-5
                rounded-xl
                border
                border-amber-300
                bg-amber-50
                px-4
                py-4
              "
              role="status"
              aria-live="polite"
            >
              <p
                class="
                  font-semibold
                  text-amber-900
                "
              >
                Payment is being verified
              </p>

              <p
                class="
                  mt-1
                  text-sm
                  leading-6
                  text-amber-800
                "
              >
                The payment provider did not return
                a final result.

                Do not collect or submit another
                payment while BrewHub verifies the
                current payment status.
              </p>
            </div>

            <button
              v-else-if="
                createdOrder.status
                === 'PENDING_PAYMENT'
                && createdOrder.paymentState
                !== 'VERIFYING'
              "
              type="button"
              :disabled="
                completingPayment
                || simulatingPaymentTimeout
              "
              class="
                mt-4
                w-full
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:opacity-90
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              style="
                background-color:
                  var(--color-brew-800);
              "
              @click="
                completeCreatedOrderPayment
              "
            >
              {{
                completingPayment
                  ? 'Completing Payment...'
                  : 'Complete Cash Payment'
              }}
            </button>

            <div
              v-if="
                createdOrder.status
                === 'COMPLETED'
              "
              class="
                mt-5
                rounded-xl
                border
                border-green-300
                bg-green-100
                px-4
                py-4
              "
            >
              <p
                class="
                  font-semibold
                  text-green-900
                "
              >
                Payment complete
              </p>

              <p
                class="
                  mt-1
                  text-sm
                  leading-6
                  text-green-800
                "
              >
                Cash payment was recorded and
                this POS order is completed.
              </p>
            </div>

          <button
            <button
              v-if="
                createdOrder.status
                === 'COMPLETED'
              "
              type="button"
            class="
              mt-5
              w-full
              rounded-xl
              border
              border-green-300
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-green-800
              transition
              hover:bg-green-100
            "
            @click="
              startNewPosOrder
            "
          >
            Start New POS Order
          </button>

          <button
            v-if="
              isDevelopment
              && createdOrder.status
                === 'PENDING_PAYMENT'
                && createdOrder.paymentState
                !== 'VERIFYING'
            "
            type="button"
            :disabled="
              completingPayment
              || simulatingPaymentTimeout
            "
            class="
              mt-3
              w-full
              rounded-xl
              border
              border-amber-300
              bg-amber-50
              px-4
              py-2.5
              text-sm
              font-semibold
              text-amber-900
              transition
              hover:bg-amber-100
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
            @click="
              simulateCreatedOrderPaymentTimeout
            "
          >
            {{
              simulatingPaymentTimeout
                ? 'Simulating Timeout...'
                : 'TESDA: Simulate Payment Timeout'
            }}
          </button>

        </div>
        </div>
      </aside>
    </div>
  </section>
</template>
