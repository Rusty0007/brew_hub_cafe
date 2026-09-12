<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const route = useRoute()

const registerDestination = computed(() => {
  const requestedRedirect =
    typeof route.query.redirect === 'string'
      ? route.query.redirect
      : null

  if (
    requestedRedirect
    && requestedRedirect.startsWith('/')
    && !requestedRedirect.startsWith('//')
  ) {
    return {
      path: '/register',
      query: {
        redirect:
          requestedRedirect,
      },
    }
  }

  return '/register'
})

const email = ref('')
const password = ref('')

const isSubmitting = ref(false)
const {
  showSuccess,
  showError,
  showWarning,
} = useAppModal()

const errorMessage = ref('')

const {
  $csrfFetch,
} = useNuxtApp()

const {
  fetch: refreshSession,
} = useUserSession()


async function submitLogin() {
  isSubmitting.value = true

  try {
    const response =
      await $csrfFetch<{
        user: {
          id: number
          username: string
          displayName: string
          email: string | null
          roles: string[]
        }
      }>(
        '/api/auth/login',
        {
          method: 'POST',
        
          body: {
            email:
              email.value,
          
            password:
              password.value,
          },
        },
      )

    // Login changed the cookie, so refresh
    // nuxt-auth-utils' frontend session state.
    await refreshSession()

    const roles =
      response.user.roles ?? []

    let defaultDestination =
      '/account'

    if (roles.includes('ADMIN')) {
      defaultDestination =
        '/admin'
    }
    else if (
      roles.includes('MANAGER')
    ) {
      defaultDestination =
        '/staff/manager'
    }
    else if (
      roles.includes('CASHIER')
    ) {
      defaultDestination =
        '/staff/cashier'
    }

    const requestedRedirect =
      typeof route.query.redirect
        === 'string'
        ? route.query.redirect
        : null

    let redirect =
      defaultDestination

    /*
     * Only accept internal BrewHub
     * destinations appropriate for
     * the authenticated account.
     */
    if (
      requestedRedirect
      && requestedRedirect.startsWith('/')
      && !requestedRedirect.startsWith('//')
    ) {
      const isAdminRoute =
        requestedRedirect === '/admin'
        || requestedRedirect.startsWith(
          '/admin/',
        )

      const isStaffRoute =
        requestedRedirect === '/staff'
        || requestedRedirect.startsWith(
          '/staff/',
        )

      const isCustomerRoute =
        requestedRedirect === '/cart'
        || requestedRedirect === '/account'
        || requestedRedirect.startsWith(
          '/account/',
        )

      if (
        roles.includes('ADMIN')
        && isAdminRoute
      ) {
        redirect =
          requestedRedirect
      }
      else if (
        roles.includes('MANAGER')
        && isStaffRoute
      ) {
        redirect =
          requestedRedirect
      }
      else if (
        roles.includes('CASHIER')
        && isStaffRoute
      ) {
        redirect =
          requestedRedirect
      }
      else if (
        roles.length === 0
        && isCustomerRoute
      ) {
        redirect =
          requestedRedirect
      }
    }

    showSuccess({
      title: 'Welcome to BrewHub',
      message:
        `Signed in successfully as ${response.user.displayName}.`,
      primaryLabel: 'Continue',
    })

    await navigateTo(
      redirect,
    )
  }
    catch (error: unknown) {
    let statusCode:
      number | undefined

    let statusMessage:
      string | undefined

    if (
      error
      && typeof error === 'object'
    ) {
      if (
        'statusCode' in error
        && typeof error.statusCode
          === 'number'
      ) {
        statusCode =
          error.statusCode
      }

      if (
        'statusMessage' in error
        && typeof error.statusMessage
          === 'string'
      ) {
        statusMessage =
          error.statusMessage
      }

      if (
        'data' in error
        && error.data
        && typeof error.data
          === 'object'
        && 'statusMessage' in error.data
        && typeof error.data.statusMessage
          === 'string'
      ) {
        statusMessage =
          error.data.statusMessage
      }

      if (
        'response' in error
        && error.response
        && typeof error.response
          === 'object'
        && 'status' in error.response
        && typeof error.response.status
          === 'number'
      ) {
        statusCode =
          error.response.status
      }
    }

    if (
  statusMessage
  === 'Invalid email or password'
  || statusCode === 400
) {
  showError({
    title: 'Sign In Failed',
    message:
      'The email or password you entered is incorrect.',
    primaryLabel: 'Try Again',
  })

  return
}

if (statusCode === 403) {
  showError({
    title: 'Security Validation Failed',
    message:
      'BrewHub could not validate this sign-in request. Refresh the page and try again.',
    primaryLabel: 'OK',
  })

  return
}

if (statusCode === 429) {
  showWarning({
    title: 'Too Many Sign In Attempts',
    message:
      'Too many sign-in attempts were made. Please wait a moment before trying again.',
    primaryLabel: 'OK',
  })

  return
}

if (
  statusCode
  && statusCode >= 500
) {
  showError({
    title: 'BrewHub Server Error',
    message:
      'BrewHub could not complete the sign-in request. Please try again shortly.',
    primaryLabel: 'OK',
  })

  return
}

showError({
  title: 'Unable to Sign In',
  message:
    'BrewHub could not complete the sign-in request. Please try again.',
  primaryLabel: 'OK',
})
  }
  finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <section
    class="flex min-h-[calc(100dvh-10rem)] items-center justify-center px-4 py-8 sm:px-6 sm:py-16"
  >
    <div class="w-full max-w-md">
      <div
        class="rounded-4xl border border-brew-200 bg-white p-4 shadow-[0_24px_80px_rgba(74,45,28,0.08)] sm:p-10"
      >
        <!-- Brand icon -->
        <div
          class="flex size-12 items-center justify-center rounded-full bg-brew-900 text-sm font-bold text-white"
        >
          B
        </div>

        <div class="mt-8">
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Staff Access
          </p>

          <h1
            class="mt-3 text-3xl font-semibold tracking-tight text-brew-950"
          >
            Sign in to BrewHub
          </h1>

          <p class="mt-3 leading-7 text-brew-500">
            Enter your staff account credentials to continue.
          </p>
        </div>

        <form
          class="mt-8 space-y-5"
          @submit.prevent="submitLogin"
        >
          <!-- Email -->
          <div>
            <label
              for="email"
              class="text-sm font-medium text-brew-800"
            >
              Email
            </label>

            <input
              id="email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              autofocus
              class="mt-2 w-full rounded-2xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition placeholder:text-brew-400 focus:border-brew-500 focus:ring-2 focus:ring-brew-100"
              placeholder="Enter your email"
            >
          </div>

          <!-- Password -->
          <div>
            <label
              for="password"
              class="text-sm font-medium text-brew-800"
            >
              Password
            </label>

            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="mt-2 w-full rounded-2xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition placeholder:text-brew-400 focus:border-brew-500 focus:ring-2 focus:ring-brew-100"
              placeholder="Enter your password"
            >
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center rounded-full bg-brew-900 px-5 py-3 font-semibold text-white transition hover:bg-brew-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{
              isSubmitting
                ? 'Signing in...'
                : 'Sign in'
            }}
          </button>
        </form>

        <div
          class="mt-8 border-t border-brew-100 pt-6 text-center"
        >
          <p class="text-sm text-brew-500">
            New to BrewHub?
          </p>
        
          <NuxtLink
            :to="registerDestination"
            class="mt-2 inline-block text-sm font-semibold text-brew-800 transition hover:text-brew-950"
          >
            Create a customer account
          </NuxtLink>
        </div>
              </div>
            </div>
  </section>
</template>