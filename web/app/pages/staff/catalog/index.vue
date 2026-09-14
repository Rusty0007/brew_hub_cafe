<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})

interface ManagedProduct {
  id: number
  sku: string
  name: string
  description: string | null
  basePrice: number
  trackInventory: boolean
  isActive: boolean

  category: {
    id: number
    name: string
  } | null
}

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<{
  products: ManagedProduct[]
}>(
  '/api/staff/catalog/products',
)

const products = computed(
  () => data.value?.products ?? [],
)

const activeCount = computed(
  () =>
    products.value.filter(
      product => product.isActive,
    ).length,
)

const inactiveCount = computed(
  () =>
    products.value.filter(
      product => !product.isActive,
    ).length,
)
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-4 sm:px-6 py-14 lg:px-8"
  >
    <NuxtLink
      to="/staff/manager"
      class="text-sm font-medium text-brew-500 transition hover:text-brew-800"
    >
      ← Manager Dashboard
    </NuxtLink>

    <div
      class="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
        >
          Management
        </p>

        <h1
          class="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-brew-950"
        >
          Catalog Management
        </h1>

        <p
          class="mt-4 max-w-2xl leading-7 text-brew-500"
        >
          Manage BrewHub products,
          pricing, categories, and
          product availability.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="
            inline-flex
            items-center
            justify-center
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
            hover:bg-brew-50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          :disabled="pending"
          @click="refresh()"
        >
          {{
            pending
              ? 'Refreshing...'
              : 'Refresh'
          }}
        </button>
        <NuxtLink
          to="/staff/catalog/categories"
          class="inline-flex items-center justify-center rounded-xl border border-brew-200 px-5 py-3 text-sm font-semibold text-brew-700 transition hover:bg-brew-50"
        >
          Manage categories
        </NuxtLink>

        <NuxtLink
          to="/staff/catalog/new"
          class="inline-flex items-center justify-center rounded-xl bg-brew-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brew-900"
          style="background-color: var(--color-brew-800);"
        >
          Add product
        </NuxtLink>
      </div>

    </div>

    <div
      class="
        mt-8
        grid
        gap-2
        sm:gap-4
      "
      style="
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
      "
    >
      <div
        class="
          min-w-0
          rounded-2xl
          border
          border-brew-200
          bg-white
          p-3
          sm:p-5
        "
      >
        <p
          class="
            text-[11px]
            font-medium
            leading-4
            text-brew-500
            sm:text-sm
          "
        >
          Total products
        </p>

        <AppSkeleton
          v-if="pending && products.length === 0"
          class="mt-3 h-9 w-16"
        />

        <p
          v-else
          class="
            mt-1
            text-2xl
            font-semibold
            text-brew-950
            sm:mt-2
            sm:text-3xl
          "
        >
          {{ products.length }}
        </p>
      </div>

      <div
        class="
          min-w-0
          rounded-2xl
          border
          border-brew-200
          bg-white
          p-3
          sm:p-5
        "
      >
        <p
          class="
            text-[11px]
            font-medium
            leading-4
            text-brew-500
            sm:text-sm
          "
        >
          Active
        </p>

        <AppSkeleton
          v-if="pending && products.length === 0"
          class="mt-3 h-9 w-16"
        />

        <p
          v-else
          class="
            mt-1
            text-2xl
            font-semibold
            text-brew-950
            sm:mt-2
            sm:text-3xl
          "
        >
          {{ activeCount }}
        </p>
      </div>

      <div
        class="
          min-w-0
          rounded-2xl
          border
          border-brew-200
          bg-white
          p-3
          sm:p-5
        "
      >
        <p
          class="
            text-[11px]
            font-medium
            leading-4
            text-brew-500
            sm:text-sm
          "
        >
          Inactive
        </p>

        <AppSkeleton
          v-if="pending && products.length === 0"
          class="mt-3 h-9 w-16"
        />

        <p
          v-else
          class="
            mt-1
            text-2xl
            font-semibold
            text-brew-950
            sm:mt-2
            sm:text-3xl
          "
        >
          {{ inactiveCount }}
        </p>
      </div>
    </div>

    <div
      v-if="
        pending
        && products.length === 0
      "
      role="status"
      aria-label="Loading catalog products"
      class="
        mt-8
        rounded-3xl
        border
        border-brew-200
        bg-white
        p-4 sm:p-6
      "
    >
      <AppTableSkeleton
        :rows="8"
        :columns="5"
      />
    </div>

    <AppStatePanel
      v-else-if="error"
      class="mt-8"
      variant="error"
      title="Unable to load catalog"
      message="
        BrewHub could not load the current
        product catalog. Try again to reload
        the latest product data.
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
        @click="refresh()"
      >
        Try Again
      </button>
    </AppStatePanel>

    <div
      v-else-if="products.length > 0"
      class="
        mt-8
        overflow-hidden
        rounded-3xl
        border
        border-brew-200
        bg-white
      "
    >
      <!-- MOBILE PRODUCT CARDS -->
      <div
        class="
          divide-y
          divide-brew-100
          md:hidden
        "
      >
        <article
          v-for="product in products"
          :key="product.id"
          class="p-4"
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
              <p
                class="
                  truncate
                  text-base
                  font-semibold
                  text-brew-950
                "
              >
                {{ product.name }}
              </p>

              <p
                class="
                  mt-1
                  text-xs
                  text-brew-500
                "
              >
                {{ product.sku }}
              </p>
            </div>

            <span
              class="
                inline-flex
                shrink-0
                rounded-full
                px-2.5
                py-1
                text-xs
                font-semibold
              "
              :class="
                product.isActive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              "
            >
              {{
                product.isActive
                  ? 'Active'
                  : 'Inactive'
              }}
            </span>
          </div>

          <div
            class="
              mt-4
              grid
              grid-cols-2
              gap-4
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
                Category
              </p>

              <p
                class="
                  mt-1
                  text-sm
                  font-medium
                  text-brew-800
                "
              >
                {{
                  product.category?.name
                  ?? 'Uncategorized'
                }}
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
                Price
              </p>

              <p
                class="
                  mt-1
                  text-lg
                  font-bold
                  text-brew-950
                "
              >
                ₱{{
                  product.basePrice
                    .toFixed(2)
                }}
              </p>
            </div>
          </div>

          <div
            class="
              mt-4
              border-t
              border-brew-100
              pt-4
            "
          >
            <NuxtLink
              :to="`/staff/catalog/${product.id}`"
              class="
                inline-flex
                w-full
                items-center
                justify-center
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
            >
              Manage Product
            </NuxtLink>
          </div>
        </article>
      </div>

      <!-- DESKTOP PRODUCTS TABLE -->
      <div
        class="
          hidden
          overflow-x-auto
          md:block
        "
        tabindex="0"
        role="region"
        aria-label="Products, scroll horizontally for more columns"
      >
        <table
          class="w-full text-left"
          style="min-width: 850px;"
        >
          <thead class="bg-brew-50">
            <tr>
              <th
                class="px-6 py-4 text-sm font-semibold text-brew-900"
              >
                Product
              </th>

              <th
                class="px-6 py-4 text-sm font-semibold text-brew-900"
              >
                Category
              </th>

              <th
                class="px-6 py-4 text-sm font-semibold text-brew-900"
              >
                Price
              </th>

              <th
                class="px-6 py-4 text-sm font-semibold text-brew-900"
              >
                Status
              </th>

              <th
                class="px-6 py-4 text-sm font-semibold text-brew-900"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody
            class="divide-y divide-brew-100"
          >
            <tr
              v-for="product in products"
              :key="product.id"
            >
              <td class="px-6 py-5">
                <p
                  class="font-semibold text-brew-950"
                >
                  {{ product.name }}
                </p>

                <p
                  class="mt-1 text-sm text-brew-500"
                >
                  {{ product.sku }}
                </p>
              </td>

              <td
                class="px-6 py-5 text-sm text-brew-700"
              >
                {{
                  product.category?.name
                  ?? 'Uncategorized'
                }}
              </td>

              <td
                class="px-6 py-5 font-medium text-brew-950"
              >
                ₱{{
                  product.basePrice
                    .toFixed(2)
                }}
              </td>

              <td class="px-6 py-5">
                <span
                  class="
                    inline-flex
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-semibold
                  "
                  :class="
                    product.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  "
                >
                  {{
                    product.isActive
                      ? 'Active'
                      : 'Inactive'
                  }}
                </span>
              </td>

              <td class="px-6 py-5">
                <NuxtLink
                  :to="`/staff/catalog/${product.id}`"
                  class="
                    inline-flex
                    rounded-xl
                    border
                    border-brew-200
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-brew-700
                    transition
                    hover:bg-brew-50
                  "
                >
                  Manage
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <AppStatePanel
      v-else
      class="mt-8"
      variant="empty"
      title="No products yet"
      message="
        Add the first BrewHub product to
        begin managing pricing, categories,
        and product availability.
      "
>
      <NuxtLink
        to="/staff/catalog/new"
        class="
          inline-flex
          rounded-xl
          bg-brew-800
          px-5
          py-2.5
          text-sm
          font-semibold
          text-white
          transition
          hover:bg-brew-900
        "
      >
        Add Product
      </NuxtLink>
</AppStatePanel>
  </section>
</template>