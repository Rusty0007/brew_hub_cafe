<script setup lang="ts">
interface Category {
  id: number
  name: string
  description?: string | null
  isActive: boolean
}

interface Product {
  id: number
  categoryId?: number | null
  sku: string
  name: string
  description?: string | null
  basePrice: string | number
  trackInventory: boolean
  isActive: boolean
}

interface CategoryResponse {
  data: Category[]
  meta: {
    count: number
    limit: number
  }
}

interface ProductResponse {
  data: Product[]
  meta: {
    count: number
    total: number
    limit: number
    offset: number
    categoryId: number | null
    search: string | null
  }
}

// ---------------------------------------------------------
// FILTER STATE
// ---------------------------------------------------------

const selectedCategoryId = ref<number | null>(null)

// What the user is currently typing.
const searchInput = ref('')

// What is actually sent to the API.
const searchQuery = ref('')

// Number of products shown per page.
const limit = 8

// Starting row for pagination.
const offset = ref(0)

// ---------------------------------------------------------
// CATEGORIES API
// ---------------------------------------------------------

const {
  data: categoriesResponse,
  pending: categoriesPending,
  error: categoriesError,
} = await useLazyFetch<CategoryResponse>(
  '/api/catalog/categories',
)

// ---------------------------------------------------------
// PRODUCTS API QUERY
// ---------------------------------------------------------

const productQuery = computed(() => ({
  categoryId:
    selectedCategoryId.value ?? undefined,

  search:
    searchQuery.value || undefined,

  limit,

  offset: offset.value,
}))

// Because productQuery is reactive, changing category,
// search, or offset causes the products API to run again.
const {
  data: productsResponse,
  pending: productsPending,
  error: productsError,
} = await useLazyFetch<ProductResponse>(
  '/api/catalog/products',
  {
    query: productQuery,
  },
)

// ---------------------------------------------------------
// RESPONSE DATA
// ---------------------------------------------------------

const categories = computed(() => {
  return categoriesResponse.value?.data ?? []
})

const products = computed(() => {
  return productsResponse.value?.data ?? []
})

const totalProducts = computed(() => {
  return productsResponse.value?.meta.total ?? 0
})

// ---------------------------------------------------------
// CATEGORY FILTER
// ---------------------------------------------------------

function selectCategory(
  categoryId: number | null,
) {
  selectedCategoryId.value = categoryId

  // Return to first page whenever category changes.
  offset.value = 0
}

// ---------------------------------------------------------
// SEARCH
// ---------------------------------------------------------

function submitSearch() {
  const normalizedSearch =
    searchInput.value.trim()

  /*
   * If the user searches an exact
   * category name such as "Coffee",
   * "Pastries", or "Cold Drinks",
   * treat it as a category selection.
   */
  const matchingCategory =
    categories.value.find(
      category =>
        category.name
          .toLowerCase()
        === normalizedSearch
          .toLowerCase(),
    )

  if (matchingCategory) {
    selectedCategoryId.value =
      matchingCategory.id

    searchQuery.value = ''
    offset.value = 0

    return
  }

  watch(
  searchInput,
  (value) => {
    if (
      value.trim() === ''
      && searchQuery.value !== ''
    ) {
      searchQuery.value = ''
      offset.value = 0
    }
  },
)

  /*
   * A normal text search should search
   * the entire catalog rather than only
   * the previously selected category.
   */
  selectedCategoryId.value = null

  searchQuery.value =
    normalizedSearch

  offset.value = 0
}

function clearSearch() {
  searchInput.value = ''
  searchQuery.value = ''
  offset.value = 0
}

// ---------------------------------------------------------
// PAGINATION
// ---------------------------------------------------------

const hasPreviousPage = computed(() => {
  return offset.value > 0
})

const hasNextPage = computed(() => {
  return (
    offset.value + products.value.length
    < totalProducts.value
  )
})

const currentPage = computed(() => {
  return Math.floor(offset.value / limit) + 1
})

const totalPages = computed(() => {
  return Math.max(
    Math.ceil(totalProducts.value / limit),
    1,
  )
})

function previousPage() {
  offset.value = Math.max(
    offset.value - limit,
    0,
  )
}

function nextPage() {
  if (hasNextPage.value) {
    offset.value += limit
  }
}
</script>

<template>
  <div class="bg-brew-50">
    <!-- MENU INTRO -->
    <section
      class="border-b border-brew-200 bg-white"
    >
      <div
        class="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:px-8 lg:py-14"
      >
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.22em] text-brew-500"
            >
              BrewHub Menu
            </p>

            <h1
              class="mt-3 text-3xl font-semibold tracking-tight text-brew-950 sm:text-5xl"
            >
              Find your favorite.
            </h1>

            <p
              class="mt-4 max-w-2xl text-lg leading-8 text-brew-500"
            >
              Explore handcrafted coffee,
              refreshing drinks, pastries,
              and BrewHub cafe favorites.
            </p>
          </div>

          <div
            class="rounded-full border border-brew-200 bg-brew-50 px-5 py-2 text-sm font-medium text-brew-600"
          >
            {{ totalProducts }}
            product{{ totalProducts === 1 ? '' : 's' }}
          </div>
        </div>
      </div>
    </section>

    <!-- FILTERS + PRODUCTS -->
    <section
      class="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:px-8"
    >
      <!-- FILTER PANEL -->
      <div
        class="rounded-3xl border border-brew-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <!-- SEARCH -->
        <form
          class="flex flex-col gap-3 lg:flex-row"
          @submit.prevent="submitSearch"
        >
          <div class="relative flex-1">
            <input
              v-model="searchInput"
              type="search"
              placeholder="Search coffee, drinks, pastries, or SKU..."
              class="w-full rounded-xl border border-brew-200 bg-brew-50 px-5 py-3.5 text-sm text-brew-900 outline-none transition placeholder:text-brew-400 focus:border-brew-500 focus:ring-2 focus:ring-brew-100"
            >
          </div>

          <button
            type="submit"
            class="rounded-xl bg-brew-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brew-700"
          >
            Search
          </button>

          <button
            v-if="searchQuery"
            type="button"
            class="rounded-xl border border-brew-200 bg-white px-6 py-3.5 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            @click="clearSearch"
          >
            Clear
          </button>
        </form>

        <!-- CATEGORY AREA -->
        <div class="mt-7 border-t border-brew-100 pt-6">
          <p
            class="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Browse by category
          </p>

          <div
  v-if="categoriesPending"
  class="flex flex-wrap gap-3"
>
          <AppSkeleton
            v-for="index in 5"
            :key="index"
            class="h-10 w-28 rounded-full"
          />
        </div>

        <AppStatePanel
          v-else-if="categoriesError"
          variant="error"
          title="Unable to load categories"
          message="Product categories could not be retrieved."
        />

        <CatalogCategoryFilter
          v-else
          :categories="categories"
          :selected-category-id="selectedCategoryId"
          @select="selectCategory"
        />
        </div>
      </div>

      <!-- RESULT HEADER -->
      <div
        class="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2
            class="text-2xl font-semibold text-brew-950"
          >
            Our Menu
          </h2>

          <p
            class="mt-1 text-sm text-brew-500"
          >
            <template v-if="searchQuery">
              Results for "{{ searchQuery }}"
            </template>

            <template v-else>
              Showing available BrewHub products
            </template>
          </p>
        </div>

        <p
          v-if="totalProducts > 0"
          class="text-sm text-brew-500"
        >
          Showing
          {{ offset + 1 }}
          –
          {{
            Math.min(
              offset + products.length,
              totalProducts,
            )
          }}
          of
          {{ totalProducts }}
        </p>
      </div>

      <!-- PRODUCTS -->
      <div class="mt-6">
  <!-- Loading -->
    <AppCardSkeleton
      v-if="productsPending"
      :count="8"
    />

        <!-- Error -->
        <!-- Error -->
      <AppStatePanel
        v-else-if="productsError"
        variant="error"
        title="Unable to load products"
        message="The BrewHub menu could not be loaded. Please try again."
      />

        <!-- Empty -->
        <AppStatePanel
          v-else-if="totalProducts === 0"
          title="No products found"
          :message="
            searchQuery
              ? `No products match &quot;${searchQuery}&quot;. Try another search or select a category.`
              : 'There are currently no products available for this category.'
          "
        >
          <button
            v-if="searchQuery"
            type="button"
            class="
              rounded-xl
              border
              border-brew-200
              bg-white
              px-5
              py-3
              text-sm
              font-semibold
              text-brew-700
              transition
              hover:bg-brew-100
            "
            @click="clearSearch"
          >
            Clear search
          </button>
        </AppStatePanel>

        <!-- PRODUCT GRID -->
        <div
          v-else
          class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <CatalogProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>
      </div>

      <!-- PAGINATION -->
      <div
        v-if="
          !productsPending
          && !productsError
          && totalProducts > limit
        "
        class="mt-12 flex flex-col gap-5 border-t border-brew-200 pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <button
          type="button"
          :disabled="!hasPreviousPage"
          class="rounded-xl border border-brew-200 bg-white px-5 py-3 text-sm font-medium text-brew-700 transition hover:bg-brew-100 disabled:cursor-not-allowed disabled:opacity-40"
          @click="previousPage"
        >
          ← Previous
        </button>

        <div class="text-center">
          <p
            class="text-sm font-semibold text-brew-800"
          >
            Page {{ currentPage }}
            of {{ totalPages }}
          </p>

          <p
            class="mt-1 text-xs text-brew-500"
          >
            {{
              totalProducts
            }}
            products available
          </p>
        </div>

        <button
          type="button"
          :disabled="!hasNextPage"
          class="rounded-xl bg-brew-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-brew-700 disabled:cursor-not-allowed disabled:opacity-40"
          @click="nextPage"
        >
          Next →
        </button>
      </div>
    </section>
  </div>
</template>