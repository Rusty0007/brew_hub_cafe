<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'guest',
})

const route = useRoute()

const {
  fetch: refreshSession,
} = useUserSession()

const form = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const submitting = ref(false)
const errorMessage = ref('')

function getCustomerRedirect() {
  const requestedRedirect =
    typeof route.query.redirect === 'string'
      ? route.query.redirect
      : null

  if (
    !requestedRedirect
    || !requestedRedirect.startsWith('/')
    || requestedRedirect.startsWith('//')
  ) {
    return null
  }

  const isAllowedCustomerRoute =
    requestedRedirect === '/cart'
    || requestedRedirect === '/account'
    || requestedRedirect.startsWith(
      '/account/',
    )

  return isAllowedCustomerRoute
    ? requestedRedirect
    : null
}

const loginDestination =
  computed(() => {
    const redirect =
      getCustomerRedirect()

    if (!redirect) {
      return '/login'
    }

    return {
      path: '/login',
      query: {
        redirect,
      },
    }
  })

async function register() {
  errorMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value =
      'Passwords do not match.'

    return
  }

  submitting.value = true

  try {
    await $fetch(
      '/api/auth/register',
      {
        method: 'POST',

        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
        },
      },
    )

    await refreshSession()

    await navigateTo(
      getCustomerRedirect()
      ?? '/catalog'
    )
  }
  catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage
      ?? error?.statusMessage
      ?? 'Unable to create account.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-brew-50 text-brew-950"
  >
    <div
      class="grid min-h-screen lg:grid-cols-2"
    >
      <!-- LEFT / BRAND -->
      <section
        class="relative hidden overflow-hidden lg:block"
        style="
          background-image:
            url('/images/landing/Desktop-Size.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        "
      >
        <div
          class="absolute inset-0"
          style="
            background:
              linear-gradient(
                90deg,
                rgba(58, 35, 24, 0.78),
                rgba(58, 35, 24, 0.35)
              );
          "
        />

        <div
          class="relative z-10 flex min-h-screen flex-col justify-between p-12"
        >
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-4 text-white"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-semibold text-brew-900"
            >
              B
            </div>

            <div>
              <p
                class="text-xl font-semibold"
              >
                BrewHub Cafe
              </p>

              <p
                class="text-xs uppercase tracking-widest text-brew-100"
              >
                Coffee & comfort
              </p>
            </div>
          </NuxtLink>

          <div class="max-w-xl">
            <p
              class="text-sm font-semibold uppercase tracking-widest text-brew-100"
            >
              Join BrewHub
            </p>

            <h1
              class="mt-5 text-5xl font-semibold leading-tight text-white"
            >
              Your next coffee
              moment starts here.
            </h1>

            <p
              class="mt-6 max-w-lg text-lg leading-8 text-brew-100"
            >
              Create your BrewHub account
              and make ordering your cafe
              favorites easier.
            </p>
          </div>

          <p
            class="text-sm text-brew-100"
          >
            Brewed for every moment.
          </p>
        </div>
      </section>

      <!-- RIGHT / FORM -->
      <main
        class="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14"
      >
        <div class="w-full max-w-xl">
          <!-- MOBILE BRAND -->
          <NuxtLink
            to="/"
            class="mb-10 flex items-center gap-3 lg:hidden"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-full bg-brew-900 font-semibold text-white"
            >
              B
            </div>

            <span
              class="text-xl font-semibold text-brew-950"
            >
              BrewHub Cafe
            </span>
          </NuxtLink>

          <div>
            <p
              class="text-xs font-semibold uppercase tracking-widest text-brew-500"
            >
              Customer Account
            </p>

            <h2
              class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
            >
              Create your account
            </h2>

            <p
              class="mt-4 leading-7 text-brew-600"
            >
              Enter your details to get
              started with BrewHub Cafe.
            </p>
          </div>

          <form
            class="mt-10"
            @submit.prevent="register"
          >
            <!-- NAME -->
            <div
              class="grid gap-5 sm:grid-cols-2"
            >
              <label>
                <span
                  class="text-sm font-medium text-brew-900"
                >
                  First name
                </span>

                <input
                  v-model.trim="form.firstName"
                  type="text"
                  autocomplete="given-name"
                  required
                  maxlength="100"
                  class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                  placeholder="Juan"
                >
              </label>

              <label>
                <span
                  class="text-sm font-medium text-brew-900"
                >
                  Last name
                </span>

                <input
                  v-model.trim="form.lastName"
                  type="text"
                  autocomplete="family-name"
                  required
                  maxlength="100"
                  class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                  placeholder="Dela Cruz"
                >
              </label>
            </div>

            <!-- USERNAME -->
            <label class="mt-5 block">
              <span
                class="text-sm font-medium text-brew-900"
              >
                Username
              </span>

              <input
                v-model.trim="form.username"
                type="text"
                autocomplete="username"
                required
                minlength="4"
                maxlength="80"
                class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                placeholder="juandelacruz"
              >

              <p
                class="mt-2 text-xs text-brew-500"
              >
                Letters, numbers, dots,
                underscores, and hyphens only.
              </p>
            </label>

            <!-- EMAIL -->
            <label class="mt-5 block">
              <span
                class="text-sm font-medium text-brew-900"
              >
                Email
              </span>

              <input
                v-model.trim="form.email"
                type="email"
                autocomplete="email"
                required
                maxlength="255"
                class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                placeholder="juan@example.com"
              >
            </label>

            <!-- PHONE -->
            <label class="mt-5 block">
              <span
                class="text-sm font-medium text-brew-900"
              >
                Phone
              </span>

              <span
                class="ml-2 text-xs text-brew-400"
              >
                Optional
              </span>

              <input
                v-model.trim="form.phone"
                type="tel"
                autocomplete="tel"
                maxlength="40"
                class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                placeholder="0917 123 4567"
              >
            </label>

            <!-- PASSWORDS -->
            <div
              class="mt-5 grid gap-5 sm:grid-cols-2"
            >
              <label>
                <span
                  class="text-sm font-medium text-brew-900"
                >
                  Password
                </span>

                <input
                  v-model="form.password"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  maxlength="128"
                  class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                  placeholder="At least 8 characters"
                >
              </label>

              <label>
                <span
                  class="text-sm font-medium text-brew-900"
                >
                  Confirm password
                </span>

                <input
                  v-model="form.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  maxlength="128"
                  class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 outline-none transition focus:border-brew-500"
                  placeholder="Repeat password"
                >
              </label>
            </div>

            <!-- ERROR -->
            <div
              v-if="errorMessage"
              class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {{ errorMessage }}
            </div>

            <!-- SUBMIT -->
            <button
              type="submit"
              :disabled="submitting"
              class="mt-7 flex w-full items-center justify-center rounded-xl bg-brew-800 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-brew-900 disabled:cursor-not-allowed disabled:opacity-50"
              style="
                background-color:
                  var(--color-brew-800);
              "
            >
              {{
                submitting
                  ? 'Creating Account...'
                  : 'Create Account'
              }}
            </button>

            <div
              class="mt-8 border-t border-brew-200 pt-6 text-center"
            >
              <p
                class="text-sm text-brew-600"
              >
                Already have an account?

                <NuxtLink
                  :to="loginDestination"
                  class="ml-1 font-semibold text-brew-900 hover:underline"
                >
                  Sign in
                </NuxtLink>
              </p>
            </div>

            <div class="mt-5 text-center">
              <NuxtLink
                to="/"
                class="text-sm font-medium text-brew-500 transition hover:text-brew-900"
              >
                ← Back to BrewHub
              </NuxtLink>
            </div>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>