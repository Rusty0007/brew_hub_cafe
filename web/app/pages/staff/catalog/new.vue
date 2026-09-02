<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})

interface Category {
  id: number
  name: string
}

const form = reactive({
  sku: '',
  name: '',
  description: '',
  categoryId: null as number | null,
  basePrice: null as number | null,
  trackInventory: true,
  isActive: true,
})

const submitting = ref(false)
const errorMessage = ref('')

const {
  data: categoryData,
} = await useFetch<{
  categories: Category[]
}>(
  '/api/catalog/categories',
)

const categories = computed(
  () =>
    categoryData.value
      ?.categories ?? [],
)

async function createProduct() {
  errorMessage.value = ''

  if (
    form.basePrice === null
    || form.basePrice < 0
  ) {
    errorMessage.value =
      'Enter a valid product price.'

    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{
      product: {
        id: number
      }
    }>(
      '/api/staff/catalog/products',
      {
        method: 'POST',

        body: {
          sku: form.sku,
          name: form.name,
          description:
            form.description,

          categoryId:
            form.categoryId,

          basePrice:
            form.basePrice,

          trackInventory:
            form.trackInventory,

          isActive:
            form.isActive,
        },
      },
    )

    await navigateTo(
      '/staff/catalog',
    )
  }
  catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage
      ?? error?.statusMessage
      ?? 'Unable to create product.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <section
    class="mx-auto max-w-3xl px-6 py-14 lg:px-8"
  >
    <NuxtLink
      to="/staff/catalog"
      class="text-sm font-medium text-brew-500 transition hover:text-brew-800"
    >
      ← Catalog Management
    </NuxtLink>

    <div class="mt-8">
      <p
        class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
      >
        Management
      </p>

      <h1
        class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
      >
        Add Product
      </h1>

      <p
        class="mt-4 max-w-2xl leading-7 text-brew-500"
      >
        Add a new product to the
        BrewHub catalog.
      </p>
    </div>

    <form
      class="mt-10 rounded-3xl border border-brew-200 bg-white p-8 shadow-sm"
      @submit.prevent="createProduct"
    >
      <div
        class="grid gap-6 md:grid-cols-2"
      >
        <label>
          <span
            class="text-sm font-medium text-brew-900"
          >
            SKU
          </span>

          <input
            v-model.trim="form.sku"
            required
            maxlength="80"
            placeholder="COF-ESP-001"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>

        <label>
          <span
            class="text-sm font-medium text-brew-900"
          >
            Product name
          </span>

          <input
            v-model.trim="form.name"
            required
            maxlength="160"
            placeholder="Espresso"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>

        <label>
          <span
            class="text-sm font-medium text-brew-900"
          >
            Category
          </span>

          <select
            v-model="form.categoryId"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
            <option :value="null">
              Uncategorized
            </option>

            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </label>

        <label>
          <span
            class="text-sm font-medium text-brew-900"
          >
            Price
          </span>

          <div
            class="mt-2 flex overflow-hidden rounded-xl border border-brew-200 bg-brew-50 focus-within:border-brew-500"
          >
            <span
              class="flex items-center border-r border-brew-200 px-4 text-brew-500"
            >
              ₱
            </span>

            <input
              v-model.number="form.basePrice"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full bg-transparent px-4 py-3 text-brew-950 outline-none"
            >
          </div>
        </label>

        <label
          class="md:col-span-2"
        >
          <span
            class="text-sm font-medium text-brew-900"
          >
            Description
          </span>

          <textarea
            v-model.trim="form.description"
            rows="4"
            maxlength="1000"
            placeholder="Product description..."
            class="mt-2 w-full resize-none rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          />
        </label>
      </div>

      <div
        class="mt-8 grid gap-4 md:grid-cols-2"
      >
        <label
          class="flex items-start gap-3 rounded-2xl border border-brew-200 p-5"
        >
          <input
            v-model="form.trackInventory"
            type="checkbox"
            class="mt-1 h-4 w-4"
          >

          <div>
            <p
              class="font-medium text-brew-950"
            >
              Track inventory
            </p>

            <p
              class="mt-1 text-sm leading-6 text-brew-500"
            >
              Maintain stock levels for
              this product.
            </p>
          </div>
        </label>

        <label
          class="flex items-start gap-3 rounded-2xl border border-brew-200 p-5"
        >
          <input
            v-model="form.isActive"
            type="checkbox"
            class="mt-1 h-4 w-4"
          >

          <div>
            <p
              class="font-medium text-brew-950"
            >
              Product active
            </p>

            <p
              class="mt-1 text-sm leading-6 text-brew-500"
            >
              Active products appear in
              the customer catalog.
            </p>
          </div>
        </label>
      </div>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div
        class="mt-8 flex justify-end gap-3"
      >
        <NuxtLink
          to="/staff/catalog"
          class="rounded-xl border border-brew-200 px-5 py-3 text-sm font-medium text-brew-700 transition hover:bg-brew-50"
        >
          Cancel
        </NuxtLink>

        <button
          type="submit"
          :disabled="submitting"
          class="rounded-xl bg-brew-800 px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style="background-color: var(--color-brew-800);"
        >
          {{
            submitting
              ? 'Creating...'
              : 'Create product'
          }}
        </button>
      </div>
    </form>
  </section>
</template>