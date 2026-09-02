<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})

const form = reactive({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'CASHIER' as 'CASHIER' | 'MANAGER',
})

const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submitRegistration() {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{
      message: string
      user: {
        username: string
        displayName: string
        roles: string[]
      }
    }>('/api/staff/users', {
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
      `${response.user.displayName} was registered successfully.`

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
      <p
        class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
      >
        Staff Management
      </p>

      <h1
        class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
      >
        Register Staff Account
      </h1>

      <p
        class="mt-4 max-w-2xl leading-7 text-brew-500"
      >
        Create a BrewHub staff account and
        assign its access role.
      </p>
    </div>

    <form
      class="rounded-4xl border border-brew-200 bg-white p-8 shadow-sm"
      @submit.prevent="submitRegistration"
    >
      <div class="grid gap-6 md:grid-cols-2">
        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Username
          </span>

          <input
            v-model="form.username"
            required
            autocomplete="off"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none transition focus:border-brew-500"
          >
        </label>

        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Display name
          </span>

          <input
            v-model="form.displayName"
            required
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none transition focus:border-brew-500"
          >
        </label>

        <label class="block md:col-span-2">
          <span
            class="text-sm font-medium text-brew-900"
          >
            Email
          </span>

          <input
            v-model="form.email"
            type="email"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none transition focus:border-brew-500"
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
            minlength="12"
            required
            autocomplete="new-password"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none transition focus:border-brew-500"
          >
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
            minlength="12"
            required
            autocomplete="new-password"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 outline-none transition focus:border-brew-500"
          >
        </label>
      </div>

      <fieldset class="mt-7">
        <legend
          class="text-sm font-medium text-brew-900"
        >
          Staff role
        </legend>

        <div
          class="mt-3 grid gap-3 md:grid-cols-2"
        >
          <label
            class="cursor-pointer rounded-2xl border border-brew-200 p-4"
          >
            <div class="flex items-start gap-3">
              <input
                v-model="form.role"
                type="radio"
                value="CASHIER"
                class="mt-1"
              >

              <div>
                <p
                  class="font-medium text-brew-900"
                >
                  Cashier
                </p>

                <p
                  class="mt-1 text-sm leading-6 text-brew-500"
                >
                  Day-to-day ordering and
                  sales operations.
                </p>
              </div>
            </div>
          </label>

          <label
            class="cursor-pointer rounded-2xl border border-brew-200 p-4"
          >
            <div class="flex items-start gap-3">
              <input
                v-model="form.role"
                type="radio"
                value="MANAGER"
                class="mt-1"
              >

              <div>
                <p
                  class="font-medium text-brew-900"
                >
                  Manager
                </p>

                <p
                  class="mt-1 text-sm leading-6 text-brew-500"
                >
                  Management and sensitive
                  operational access.
                </p>
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      <div
        v-if="errorMessage"
        class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"
      >
        {{ successMessage }}
      </div>

      <div
        class="mt-8 flex items-center justify-end"
      >
        <button
          type="submit"
          :disabled="submitting"
          class="rounded-xl bg-brew-800 px-6 py-3 font-medium text-white transition hover:bg-brew-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{
            submitting
              ? 'Creating account...'
              : 'Create account'
          }}
        </button>
      </div>
    </form>
  </section>
</template>