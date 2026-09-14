<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})

const {
  $csrfFetch,
} = useNuxtApp()

interface Product {
  id: number
  sku: string
  name: string
  description: string | null
  categoryId: number | null
  basePrice: number
  trackInventory: boolean
  isActive: boolean
}

interface Category {
  id: number
  name: string
}

const route = useRoute()

const productId = Number(
  route.params.id,
)

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<{
  product: Product
}>(
  `/api/staff/catalog/products/${productId}`,
)

const {
  data: categoryData,
  pending: categoryPending,
  error: categoryError,
  refresh: refreshCategories,
} = await useFetch<{
  categories: Category[]
}>(
  '/api/catalog/categories',
)

const product = computed(
  () => data.value?.product,
)

const categories = computed(
  () =>
    categoryData.value
      ?.categories ?? [],
)

const form = reactive({
  name: '',
  description: '',
  categoryId: null as number | null,
  basePrice: 0,
  trackInventory: true,
  isActive: true,
})

const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const priceChangeReason =
  ref('')

const priceChanged =
  computed(() => {
    if (!product.value) {
      return false
    }

    return Number(
      form.basePrice,
    ).toFixed(2)
    !== Number(
      product.value.basePrice,
    ).toFixed(2)
  })

watch(
  product,
  current => {
    if (!current) {
      return
    }

    form.name =
      current.name

    form.description =
      current.description ?? ''

    form.categoryId =
      current.categoryId

    form.basePrice =
      current.basePrice

    form.trackInventory =
      current.trackInventory

    form.isActive =
      current.isActive
  },
  {
    immediate: true,
  },
)

async function saveChanges() {
  successMessage.value = ''
errorMessage.value = ''

if (
  priceChanged.value
  && !priceChangeReason.value.trim()
) {
  errorMessage.value =
    'Enter a reason for changing the product price.'

  return
}

saving.value = true

  try {
    await $csrfFetch(
      `/api/staff/catalog/products/${productId}`,
      {
        method: 'PATCH',

        body: {
          name: form.name,
          description:
            form.description,
          categoryId:
            form.categoryId,
          basePrice:
            form.basePrice,
          reason:
            priceChanged.value
            ? priceChangeReason.value.trim()
            : undefined,
          trackInventory:
            form.trackInventory,
          isActive:
            form.isActive,
        },
      },
    )

    await refresh()
    priceChangeReason.value = ''

    successMessage.value =
      'Product updated successfully.'
  }
  catch (error: unknown) {
    errorMessage.value =
      getApiErrorMessage(
      error,
      'Unable to update product.',
    )
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section
    class="mx-auto max-w-3xl px-4 sm:px-6 py-14 lg:px-8"
  >
    <NuxtLink
      to="/staff/catalog"
      class="text-sm font-medium text-brew-500 hover:text-brew-800"
    >
      &larr; Catalog Management
    </NuxtLink>

    <div
      v-if="
        pending
        && !product
      "
      role="status"
      aria-label="Loading product"
      class="mt-10 space-y-6"
    >
      <div>
        <AppSkeleton class="h-4 w-36" />
        <AppSkeleton class="mt-3 h-10 w-64" />
        <AppSkeleton class="mt-3 h-4 w-32" />
      </div>

      <div
        class="
          rounded-3xl
          border
          border-brew-200
          bg-white
          p-4
          sm:p-8
          shadow-sm
        "
      >
        <div
          class="
            grid
            gap-6
            md:grid-cols-2
          "
        >
          <div
            v-for="item in 4"
            :key="item"
          >
            <AppSkeleton class="h-4 w-28" />
            <AppSkeleton class="mt-2 h-12 w-full" />
          </div>
        </div>

        <AppSkeleton class="mt-6 h-28 w-full" />

        <div
          class="
            mt-8
            grid
            gap-4
            md:grid-cols-2
          "
        >
          <AppSkeleton class="h-24 w-full rounded-2xl" />
          <AppSkeleton class="h-24 w-full rounded-2xl" />
        </div>

        <AppSkeleton class="ml-auto mt-8 h-12 w-36" />
      </div>
    </div>

    <AppStatePanel
      v-else-if="error"
      class="mt-10"
      variant="error"
      title="Unable to load product"
      message="
        BrewHub could not load this product.
        Try again to reload the latest
        product information.
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

    <template v-else-if="product">
      <div class="mt-8">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
        >
          Catalog Management
        </p>

        <h1
          class="mt-3 text-3xl sm:text-4xl font-semibold text-brew-950"
        >
          {{ product.name }}
        </h1>

        <p
          class="mt-3 text-sm text-brew-500"
        >
          SKU: {{ product.sku }}
        </p>
      </div>

      <form
        class="mt-10 rounded-3xl border border-brew-200 bg-white p-4 sm:p-8 shadow-sm"
        @submit.prevent="saveChanges"
      >
        <div
          class="grid gap-6 md:grid-cols-2"
        >
          <label>
            <span
              class="text-sm font-medium text-brew-900"
            >
              Product name
            </span>

            <input
              v-model.trim="form.name"
              required
              class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
            >
          </label>

          <label
            v-if="priceChanged"
            class="md:col-span-2"
          >
            <span
              class="text-sm font-medium text-brew-900"
            >
              Price change reason
            </span>

            <p
              class="mt-1 text-sm text-brew-500"
            >
              A reason is required because changing
              a product price is recorded in the
              audit trail.
            </p>

            <textarea
              v-model.trim="priceChangeReason"
              rows="3"
              maxlength="500"
              required
              placeholder="Example: Supplier cost increased effective September 2026"
              class="mt-2 w-full resize-none rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
            />
          </label>

          <label>
            <span
              class="text-sm font-medium text-brew-900"
            >
              Category
            </span>

            <select
              v-model="form.categoryId"
              :disabled="
                categoryPending
                || !!categoryError
              "
              class="
                mt-2
                w-full
                rounded-xl
                border
                border-brew-200
                bg-brew-50
                px-4
                py-3
                outline-none
                focus:border-brew-500
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
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
            <p
              v-if="categoryPending"
              class="mt-2 text-xs text-brew-500"
            >
              Loading categories...
            </p>

            <div
              v-else-if="categoryError"
              class="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
                text-xs
                text-red-700
              "
            >
              <span>
                Unable to load categories.
              </span>

              <button
                type="button"
                class="
                  font-semibold
                  underline
                  underline-offset-2
                  hover:text-red-900
                "
                @click="refreshCategories()"
              >
                Try Again
              </button>
            </div>
          </label>

          <label>
            <span
              class="text-sm font-medium text-brew-900"
            >
              Price
            </span>

            <input
              v-model.number="form.basePrice"
              type="number"
              min="0"
              step="0.01"
              required
              class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
            >
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
              class="mt-2 w-full resize-none rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
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
            >

            <div>
              <p
                class="font-medium text-brew-950"
              >
                Track inventory
              </p>
            </div>
          </label>

          <label
            class="flex items-start gap-3 rounded-2xl border border-brew-200 p-5"
          >
            <input
              v-model="form.isActive"
              type="checkbox"
            >

            <div>
              <p
                class="font-medium text-brew-950"
              >
                Product active
              </p>

              <p
                class="mt-1 text-sm text-brew-500"
              >
                Inactive products disappear
                from the public catalog.
              </p>
            </div>
          </label>
        </div>

        <div
          v-if="successMessage"
          class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {{ successMessage }}
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <div
          class="mt-8 flex flex-wrap justify-end gap-3"
        >
          <NuxtLink
            to="/staff/catalog"
            class="rounded-xl border border-brew-200 px-5 py-3 text-sm font-medium text-brew-700"
          >
            Cancel
          </NuxtLink>

          <button
            type="submit"
            :disabled="saving"
            class="rounded-xl bg-brew-800 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            style="background-color: var(--color-brew-800);"
          >
            {{
              saving
                ? 'Saving...'
                : 'Save changes'
            }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>
