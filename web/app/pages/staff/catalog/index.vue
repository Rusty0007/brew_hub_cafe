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
    class="mx-auto max-w-7xl px-6 py-14 lg:px-8"
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
          class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
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
      class="mt-8 grid gap-4 sm:grid-cols-3"
    >
      <div
        class="rounded-2xl border border-brew-200 bg-white p-5"
      >
        <p class="text-sm text-brew-500">
          Total products
        </p>

        <p
          class="mt-2 text-3xl font-semibold text-brew-950"
        >
          {{ products.length }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-brew-200 bg-white p-5"
      >
        <p class="text-sm text-brew-500">
          Active
        </p>

        <p
          class="mt-2 text-3xl font-semibold text-brew-950"
        >
          {{ activeCount }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-brew-200 bg-white p-5"
      >
        <p class="text-sm text-brew-500">
          Inactive
        </p>

        <p
          class="mt-2 text-3xl font-semibold text-brew-950"
        >
          {{ inactiveCount }}
        </p>
      </div>
    </div>

    <div
      v-if="pending"
      class="mt-10 text-brew-500"
    >
      Loading products...
    </div>

    <div
      v-else-if="error"
      class="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
    >
      Unable to load catalog.
    </div>

    <div
      v-else
      class="mt-8 overflow-x-auto rounded-3xl border border-brew-200 bg-white"
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
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
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
                class="inline-flex rounded-xl border border-brew-200 px-4 py-2 text-sm font-medium text-brew-700 transition hover:bg-brew-50"
              >
                Manage
              </NuxtLink>
            </td>
          </tr>

          <tr
            v-if="products.length === 0"
          >
            <td
              colspan="5"
              class="px-6 py-12 text-center text-brew-500"
            >
              No products found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>