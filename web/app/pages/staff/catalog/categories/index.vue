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
  description: string | null
  isActive: boolean
}

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<{
  categories: Category[]
}>(
  '/api/staff/catalog/categories',
)

const categories = computed(
  () =>
    data.value?.categories ?? [],
)

const form = reactive({
  name: '',
  description: '',
  isActive: true,
})

const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function createCategory() {
  submitting.value = true

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await $fetch(
      '/api/staff/catalog/categories',
      {
        method: 'POST',

        body: {
          name: form.name,
          description:
            form.description,
          isActive:
            form.isActive,
        },
      },
    )

    form.name = ''
    form.description = ''
    form.isActive = true

    await refresh()

    successMessage.value =
      'Category created successfully.'
  }
  catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage
      ?? error?.statusMessage
      ?? 'Unable to create category.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-6 py-14 lg:px-8"
  >
    <NuxtLink
      to="/staff/catalog"
      class="text-sm font-medium text-brew-500 hover:text-brew-800"
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
        Category Management
      </h1>

      <p
        class="mt-4 text-brew-500"
      >
        Manage the product categories
        used throughout BrewHub.
      </p>
    </div>

    <div
      class="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]"
    >
      <form
        class="rounded-3xl border border-brew-200 bg-white p-6 shadow-sm"
        @submit.prevent="createCategory"
      >
        <h2
          class="text-xl font-semibold text-brew-950"
        >
          Add Category
        </h2>

        <label class="mt-6 block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Name
          </span>

          <input
            v-model.trim="form.name"
            required
            maxlength="120"
            placeholder="Example: Sandwiches"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
          >
        </label>

        <label class="mt-5 block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Description
          </span>

          <textarea
            v-model.trim="form.description"
            rows="4"
            maxlength="500"
            class="mt-2 w-full resize-none rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none focus:border-brew-500"
          />
        </label>

        <label
          class="mt-5 flex items-start gap-3 rounded-2xl border border-brew-200 p-4"
        >
          <input
            v-model="form.isActive"
            type="checkbox"
            class="mt-1"
          >

          <div>
            <p
              class="font-medium text-brew-950"
            >
              Category active
            </p>

            <p
              class="mt-1 text-sm text-brew-500"
            >
              Active categories can be
              used in the public catalog.
            </p>
          </div>
        </label>

        <div
          v-if="errorMessage"
          class="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="successMessage"
          class="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {{ successMessage }}
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="mt-6 w-full rounded-xl bg-brew-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style="background-color: var(--color-brew-800);"
        >
          {{
            submitting
              ? 'Creating...'
              : 'Create category'
          }}
        </button>
      </form>

      <div>
        <div
          v-if="pending"
          class="text-brew-500"
        >
          Loading categories...
        </div>

        <div
          v-else-if="error"
          class="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
        >
          Unable to load categories.
        </div>

        <div
          v-else
          class="overflow-hidden rounded-3xl border border-brew-200 bg-white"
        >
          <table class="w-full text-left">
            <thead class="bg-brew-50">
              <tr>
                <th
                  class="px-6 py-4 text-sm font-semibold text-brew-900"
                >
                  Category
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
                v-for="category in categories"
                :key="category.id"
              >
                <td class="px-6 py-5">
                  <p
                    class="font-semibold text-brew-950"
                  >
                    {{ category.name }}
                  </p>

                  <p
                    v-if="category.description"
                    class="mt-1 text-sm text-brew-500"
                  >
                    {{ category.description }}
                  </p>
                </td>

                <td class="px-6 py-5">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    :class="
                      category.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    "
                  >
                    {{
                      category.isActive
                        ? 'Active'
                        : 'Inactive'
                    }}
                  </span>
                </td>

                <td class="px-6 py-5">
                  <NuxtLink
                    :to="`/staff/catalog/categories/${category.id}`"
                    class="rounded-xl border border-brew-200 px-4 py-2 text-sm font-medium text-brew-700 hover:bg-brew-50"
                  >
                    Manage
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>