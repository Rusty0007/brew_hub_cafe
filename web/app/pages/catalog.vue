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
} = await useFetch<CategoryResponse>(
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
} = await useFetch<ProductResponse>(
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
  searchQuery.value = searchInput.value.trim()

  // New search starts from first page.
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
        class="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14"
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
              class="mt-3 text-4xl font-semibold tracking-tight text-brew-950 sm:text-5xl"
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
      class="mx-auto max-w-7xl px-6 py-10 lg:px-8"
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
            class="text-sm text-brew-500"
          >
            Loading categories...
          </div>

          <div
            v-else-if="categoriesError"
            class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            Unable to load categories.
          </div>

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
        <div
          v-if="productsPending"
          class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div
            v-for="index in 8"
            :key="index"
            class="animate-pulse overflow-hidden rounded-3xl border border-brew-200 bg-white"
          >
            <div
              class="aspect-4/3 bg-brew-100"
            />

            <div class="p-5">
              <div
                class="h-3 w-1/3 rounded bg-brew-100"
              />

              <div
                class="mt-4 h-5 w-2/3 rounded bg-brew-100"
              />

              <div
                class="mt-3 h-4 w-full rounded bg-brew-100"
              />

              <div
                class="mt-6 h-5 w-1/4 rounded bg-brew-100"
              />
            </div>
          </div>
        </div>

        <!-- Error -->
        <div
          v-else-if="productsError"
          class="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700"
        >
          Unable to load products.
        </div>

        <!-- Empty -->
        <div
          v-else-if="totalProducts === 0"
          class="rounded-3xl border border-dashed border-brew-300 bg-white px-6 py-20 text-center"
        >
          <div
            class="mx-auto flex size-16 items-center justify-center rounded-full bg-brew-100 text-brew-700"
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              class="size-8"
              aria-hidden="true"
            >
              <path
                d="M15 23h31v15c0 9-7 16-16 16S15 47 15 38V23Z"
                stroke="currentColor"
                stroke-width="3"
              />

              <path
                d="M46 28h3a8 8 0 0 1 0 16h-5"
                stroke="currentColor"
                stroke-width="3"
              />
            </svg>
          </div>

          <h2
            class="mt-6 text-xl font-semibold text-brew-900"
          >
            No products found
          </h2>

          <p
            class="mx-auto mt-2 max-w-md leading-7 text-brew-500"
          >
            {{
              searchQuery
                ? `No products match "${searchQuery}". Try another search or select a category.`
                : 'There are currently no products available for this category.'
            }}
          </p>

          <button
            v-if="searchQuery"
            type="button"
            class="mt-6 rounded-xl border border-brew-200 bg-white px-5 py-3 text-sm font-semibold text-brew-700 transition hover:bg-brew-100"
            @click="clearSearch"
          >
            Clear search
          </button>
        </div>

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