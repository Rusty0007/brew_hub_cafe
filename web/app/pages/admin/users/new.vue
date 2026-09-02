<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'admin',
  ],
})

type StaffRole =
  | 'MANAGER'
  | 'CASHIER'

const form = reactive({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'CASHIER' as StaffRole,
})

const submitting = ref(false)

const errorMessage = ref('')
const successMessage = ref('')

async function createAccount() {
  errorMessage.value = ''
  successMessage.value = ''

  if (
    form.password
    !== form.confirmPassword
  ) {
    errorMessage.value =
      'Password and confirmation do not match.'

    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{
      message: string
      user: {
        id: number
        username: string
        displayName: string
        roles: string[]
      }
    }>('/api/admin/users', {
      method: 'POST',

      body: {
        username: form.username,
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        role: form.role,
      },
    })

    successMessage.value =
      `${response.user.displayName} was created successfully.`

    form.username = ''
    form.displayName = ''
    form.email = ''
    form.password = ''
    form.confirmPassword = ''
    form.role = 'CASHIER'
  }
  catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage
      ?? error?.statusMessage
      ?? 'Unable to create staff account.'
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
    <div class="mb-10">
      <NuxtLink
        to="/admin/users"
        class="text-sm font-medium text-brew-500 transition hover:text-brew-800"
      >
        ← Back to User Management
      </NuxtLink>

      <p
        class="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
      >
        Administration
      </p>

      <h1
        class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
      >
        Create Staff Account
      </h1>

      <p
        class="mt-4 max-w-2xl leading-7 text-brew-500"
      >
        Create an account for a BrewHub
        manager or cashier.
      </p>
    </div>

    <form
      class="rounded-3xl border border-brew-200 bg-white p-8 shadow-sm"
      @submit.prevent="createAccount"
    >
      <div
        class="grid gap-6 md:grid-cols-2"
      >
        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Username
          </span>

          <input
            v-model.trim="form.username"
            required
            minlength="3"
            maxlength="80"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Display name
          </span>

          <input
            v-model.trim="form.displayName"
            required
            maxlength="120"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>

        <label
          class="block md:col-span-2"
        >
          <span
            class="text-sm font-medium text-brew-900"
          >
            Email
          </span>

          <input
            v-model.trim="form.email"
            type="email"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Password
          </span>

          <input
            v-model="form.password"
            type="password"
            required
            minlength="12"
            maxlength="128"
            autocomplete="new-password"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >

          <span
            class="mt-2 block text-xs text-brew-400"
          >
            Minimum 12 characters.
          </span>
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Confirm password
          </span>

          <input
            v-model="form.confirmPassword"
            type="password"
            required
            minlength="12"
            maxlength="128"
            autocomplete="new-password"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition focus:border-brew-500"
          >
        </label>
      </div>

      <fieldset class="mt-8">
        <legend
          class="text-sm font-medium text-brew-900"
        >
          Staff role
        </legend>

        <div
          class="mt-3 grid gap-4 md:grid-cols-2"
        >
          <label
            class="cursor-pointer rounded-2xl border p-5 transition"
            :class="
              form.role === 'CASHIER'
                ? 'border-brew-700 bg-brew-50'
                : 'border-brew-200 bg-white'
            "
          >
            <div
              class="flex items-start gap-3"
            >
              <input
                v-model="form.role"
                type="radio"
                value="CASHIER"
                class="mt-1"
              >

              <div>
                <p
                  class="font-semibold text-brew-950"
                >
                  Cashier
                </p>

                <p
                  class="mt-1 text-sm leading-6 text-brew-500"
                >
                  Handles daily sales,
                  ordering, and POS operations.
                </p>
              </div>
            </div>
          </label>

          <label
            class="cursor-pointer rounded-2xl border p-5 transition"
            :class="
              form.role === 'MANAGER'
                ? 'border-brew-700 bg-brew-50'
                : 'border-brew-200 bg-white'
            "
          >
            <div
              class="flex items-start gap-3"
            >
              <input
                v-model="form.role"
                type="radio"
                value="MANAGER"
                class="mt-1"
              >

              <div>
                <p
                  class="font-semibold text-brew-950"
                >
                  Manager
                </p>

                <p
                  class="mt-1 text-sm leading-6 text-brew-500"
                >
                  Manages catalog, inventory,
                  reports, and operations.
                </p>
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
      >
        {{ successMessage }}
      </div>

      <div
        class="mt-8 flex items-center justify-end gap-3"
      >
        <NuxtLink
          to="/admin/users"
          class="rounded-xl border border-brew-200 px-5 py-3 text-sm font-medium text-brew-700 transition hover:bg-brew-50"
        >
          Cancel
        </NuxtLink>

        <button
          type="submit"
          :disabled="submitting"
          class="rounded-xl bg-brew-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-brew-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{
            submitting
              ? 'Creating...'
              : 'Create account'
          }}
        </button>
      </div>
    </form>
  </section>
</template>