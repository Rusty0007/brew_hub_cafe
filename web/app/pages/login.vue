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

const username = ref('')
const password = ref('')

const isSubmitting = ref(false)
const errorMessage = ref('')

const {
  fetch: refreshSession,
} = useUserSession()


async function submitLogin() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch<{
      user: {
        id: number
        username: string
        displayName: string
        email: string | null
        roles: string[]
      }
    }>('/api/auth/login', {
      method: 'POST',

      body: {
        username: username.value,
        password: password.value,
      },
    })

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

    await navigateTo(
      redirect,
    )
  }
  catch (error: any) {
    const statusCode =
      error?.statusCode
      ?? error?.response?.status

    const statusMessage =
      error?.data?.statusMessage
      ?? error?.statusMessage

    if (
      statusCode === 401
      || statusMessage
        === 'Invalid credentials'
    ) {
      errorMessage.value =
        'Invalid username or password.'
    }
    else {
      errorMessage.value =
        'Unable to sign in. Please try again.'
    }
  }
  finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <section
    class="flex min-h-[calc(100vh-10rem)] items-center justify-center px-6 py-16"
  >
    <div class="w-full max-w-md">
      <div
        class="rounded-4xl border border-brew-200 bg-white p-8 shadow-[0_24px_80px_rgba(74,45,28,0.08)] sm:p-10"
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
          <!-- Username -->
          <div>
            <label
              for="username"
              class="text-sm font-medium text-brew-800"
            >
              Username
            </label>

            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              autofocus
              class="mt-2 w-full rounded-2xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none transition placeholder:text-brew-400 focus:border-brew-500 focus:ring-2 focus:ring-brew-100"
              placeholder="Enter your username"
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

          <!-- Login error -->
          <div
            v-if="errorMessage"
            role="alert"
            class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
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