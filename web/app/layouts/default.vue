<script setup lang="ts">
const {
  loggedIn,
  isStaff,
  isCustomer,
  workspaceDestination,
} = useAccountAccess()

const {
  fetch: refreshSession,
} = useUserSession()

const cart = useCartStore()

const isLoggingOut = ref(false)
const mobileMenuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const route = useRoute()

function closeMobileMenu() {
  mobileMenuOpen.value = false
  menuButton.value?.focus()
}

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

async function logout() {
  if (isLoggingOut.value) {
    return
  }

  isLoggingOut.value = true

  try {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    })

    await refreshSession()

    await navigateTo('/')
  }
  finally {
    isLoggingOut.value = false
  }
}
</script>
<template>
  <div class="min-h-screen bg-brew-50 text-brew-950">
    <header
      class="sticky top-0 z-50 border-b border-brew-200/70 bg-brew-50/90 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-3 px-4 sm:px-6 lg:px-8"
      >
        <NuxtLink
          to="/"
          class="group flex items-center gap-3"
        >
          <div
            class="flex size-10 items-center justify-center rounded-full bg-brew-900 text-sm font-bold text-white transition group-hover:bg-brew-700"
          >
            B
          </div>

          <div>
            <p class="font-semibold tracking-tight text-brew-950">
              BrewHub Cafe
            </p>

            <p class="text-xs text-brew-500">
              Coffee & comfort
            </p>
          </div>
        </NuxtLink>

        <button
          ref="menuButton"
          type="button"
          class="min-h-11 rounded-xl border border-brew-200 px-3 text-sm font-semibold lg:hidden"
          aria-controls="primary-navigation"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          {{ mobileMenuOpen ? 'Close' : 'Menu' }}
        </button>

        <nav
          id="primary-navigation"
          aria-label="Main navigation"
          class="max-h-[calc(100dvh-5rem)] w-full flex-col gap-1 overflow-y-auto pb-4 [&>a]:min-h-11 lg:flex lg:w-auto lg:flex-row lg:items-center lg:overflow-visible lg:pb-0"
          :class="mobileMenuOpen ? 'flex' : 'hidden'"
          @keydown.esc.prevent="closeMobileMenu"
        >
          <NuxtLink
            to="/"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            Home
          </NuxtLink>
        
          <NuxtLink
            to="/catalog"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            Catalog
          </NuxtLink>

          <!-- GUEST + CUSTOMER CART -->
          <NuxtLink
            v-if="!isStaff"
            to="/cart"
            class="relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              class="size-4"
              aria-hidden="true"
            >
              <path
                d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
                  
              <circle
                cx="10"
                cy="19"
                r="1"
                fill="currentColor"
              />
                  
              <circle
                cx="18"
                cy="19"
                r="1"
                fill="currentColor"
              />
            </svg>
          
            <span>
              Cart
            </span>
          
            <span
              v-if="cart.totalItems > 0"
              class="inline-flex min-w-5 items-center justify-center rounded-full bg-brew-900 px-1.5 py-0.5 text-xs font-semibold text-white"
            >
              {{ cart.totalItems }}
            </span>
          </NuxtLink>
        
          <!-- CUSTOMER ONLY -->
          <NuxtLink
            v-if="loggedIn && isCustomer"
            to="/account"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            My Account
          </NuxtLink>

          <NuxtLink
            v-if="loggedIn && isCustomer"
            to="/account/orders"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            My Orders
          </NuxtLink>
        
          <!-- STAFF ONLY -->
          <NuxtLink
            v-if="loggedIn && isStaff"
            :to="workspaceDestination"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
            active-class="bg-brew-100 text-brew-900"
          >
            Workspace
          </NuxtLink>
        
          <!-- GUEST ONLY -->
          <NuxtLink
            v-if="!loggedIn"
            to="/register"
            class="rounded-full px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900"
          >
            Create Account
          </NuxtLink>
        
          <NuxtLink
            v-if="!loggedIn"
            to="/login"
            class="rounded-full bg-brew-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-brew-700"
          >
            Sign in
          </NuxtLink>
        
          <!-- AUTHENTICATED -->
          <button
            v-else
            type="button"
            :disabled="isLoggingOut"
            class="rounded-full border border-brew-200 px-4 py-2 text-sm font-medium text-brew-600 transition hover:bg-brew-100 hover:text-brew-900 disabled:opacity-50"
            @click="logout"
          >
            {{
              isLoggingOut
                ? 'Signing out...'
                : 'Sign out'
            }}
          </button>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="border-t border-brew-200/70">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-brew-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"
      >
        <p>
          BrewHub Cafe
        </p>

        <p>
          Ordering & Inventory Management System
        </p>
      </div>
    </footer>
  </div>
</template>
