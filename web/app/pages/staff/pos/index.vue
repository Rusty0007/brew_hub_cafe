<script setup lang="ts">
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

interface CreatedPosOrder {
  id: number
  orderNo: string
  source: string
  orderType: PosOrderType
  status: string
  totalAmount: number
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

const paymentVerificationMessage =
  ref('')

const isDevelopment =
  import.meta.dev

const createOrderError =
  ref('')

const createdOrder =
  ref<CreatedPosOrder | null>(
    null,
  )

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
} = await useFetch<CategoriesResponse>(
  '/api/catalog/categories',
)

const {
  data: productsResponse,
  pending: productsPending,
  error: productsError,
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

function addProduct(
  product: CatalogProduct,
) {
  const existing =
    posLines.value.find(
      line =>
        line.productId
        === product.id,
    )

  if (existing) {
    existing.quantity += 1
    return
  }

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

function increaseQuantity(
  productId: number,
) {
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
  posLines.value =
    posLines.value.filter(
      line =>
        line.productId
        !== productId,
    )
}

function clearOrder() {
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
    createOrderError.value =
      'Add at least one product to the order.'

    return
  }

  createOrderError.value = ''
  creatingOrder.value = true

  try {
    const response =
      await $fetch<CreatePosOrderResponse>(
        '/api/staff/pos/orders',
        {
          method: 'POST',

          body: {
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

    createdOrder.value =
      response.order

    /*
     * Clear the local draft because
     * it now exists in PostgreSQL.
     */
    posLines.value = []
  }
  catch (error: unknown) {
    createOrderError.value =
      getApiErrorMessage(
        error,
        'Unable to create POS order.',
      )
  }
  finally {
    creatingOrder.value = false
  }
}

async function prepareCreatedOrderForPayment() {
  if (!createdOrder.value) {
    return
  }

  createOrderError.value = ''
  preparingPayment.value = true

  try {
    const response =
      await $fetch<{
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
  }
  catch (error: unknown) {
    createOrderError.value =
      getApiErrorMessage(
        error,
        'Unable to prepare POS order for payment.',
      )
  }
  finally {
    preparingPayment.value = false
  }
}

async function completeCreatedOrderPayment() {
  if (!createdOrder.value) {
    return
  }

  createOrderError.value = ''
  completingPayment.value = true

  try {
    const response =
      await $fetch<{
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
  }
  catch (error: unknown) {
    createOrderError.value =
      getApiErrorMessage(
        error,
        'Unable to complete POS payment.',
      )
  }
  finally {
    completingPayment.value = false
  }
}

async function simulateCreatedOrderPaymentTimeout() {
  if (!createdOrder.value) {
    return
  }

  createOrderError.value = ''
  paymentVerificationMessage.value = ''
  simulatingPaymentTimeout.value = true

  try {
    const response =
      await $fetch<{
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

    paymentVerificationMessage.value =
      response.message
  }
  catch (error: unknown) {
    createOrderError.value =
      getApiErrorMessage(
        error,
        'Unable to simulate payment timeout.',
      )
  }
  finally {
    simulatingPaymentTimeout.value = false
  }
}

function startNewPosOrder() {
  createdOrder.value = null
  createOrderError.value = ''
  paymentVerificationMessage.value = ''
  orderType.value = 'TAKEOUT'
  posLines.value = []
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
          Point of Sale
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
          {{ totalItems }}
          {{
            totalItems === 1
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
              md:grid-cols-[minmax(0,1fr)_14rem_auto]
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
                flex
                items-end
                gap-2
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
                  appliedSearch
                "
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
                  clearSearch
                "
              >
                Clear
              </button>
            </div>
          </form>

          <p
            v-if="categoriesError"
            class="
              mt-4
              text-sm
              text-red-700
            "
          >
            Unable to load
            product categories.
          </p>
        </div>

        <div
          v-if="productsPending"
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
          Loading products...
        </div>

        <div
          v-else-if="productsError"
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
          Unable to load products.
        </div>

        <div
          v-else-if="
            products.length === 0
          "
          class="
            mt-6
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-8
            text-center
          "
        >
          <h2
            class="
              font-semibold
              text-brew-950
            "
          >
            No products found
          </h2>

          <p
            class="
              mt-2
              text-sm
              text-brew-500
            "
          >
            Try another search or
            category.
          </p>
        </div>

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
                Add to Order
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
            p-6
            shadow-sm
            lg:sticky
            lg:top-6
          "
        >
          <div
            class="
              flex
              items-center
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
              </select>
            </label>

          <div
            v-if="
              posLines.length === 0
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
            v-else
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
                  class="
                    text-xs
                    font-semibold
                    text-red-700
                    hover:text-red-900
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
                  flex
                  items-center
                  justify-between
                  gap-4
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
                    class="
                      px-3
                      py-1.5
                      font-semibold
                      text-brew-700
                    "
                    @click="
                      decreaseQuantity(
                        line.productId,
                      )
                    "
                  >
                    −
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
                    class="
                      px-3
                      py-1.5
                      font-semibold
                      text-brew-700
                    "
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
                flex
                items-center
                justify-between
                gap-4
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
                {{ totalItems }}
              </span>
            </div>

            <div
              class="
                mt-3
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <span
                class="
                  text-base
                  font-semibold
                  text-brew-950
                "
              >
                Subtotal
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
                    subtotal,
                  )
                }}
              </span>
            </div>
          </div>

          <p
  v-if="createOrderError"
  class="
    mt-6
    rounded-xl
    border
    border-red-200
    bg-red-50
    px-4
    py-3
    text-sm
    text-red-700
  "
>
  {{ createOrderError }}
</p>

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
            Order Created
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
              v-else-if="
                createdOrder.status
                === 'PENDING_PAYMENT'
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

            <button
              v-if="
                createdOrder.status
                === 'PENDING_PAYMENT'
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
            v-if="
            createdOrder.status === 'DRAFT'
            || createdOrder.status === 'COMPLETED'
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

          <div
            v-if="paymentVerificationMessage"
            class="
              mt-4
              rounded-xl
              border
              border-amber-300
              bg-amber-50
              px-4
              py-4
            "
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
              a final result. Do not charge the
              customer again until the payment
              status is verified.
            </p>
          </div>
        </div>
        </div>
      </aside>
    </div>
  </section>
</template>