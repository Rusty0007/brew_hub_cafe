<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
  ],
})

interface Customer {
  id: number
  userId: number | null
  customerNo: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  isActive: boolean
}

const {
  showLeaveWarning,
  continueNavigation,
  stayOnPage,
} = useProtectedLeaveWarning()

const {
  data,
  pending,
  error,
} = await useLazyFetch<{
  customer: Customer
}>(
  '/api/customer/me',
)

const customer = computed(
  () => data.value?.customer,
)

const fullName = computed(() => {
  if (!customer.value) {
    return ''
  }

  return [
    customer.value.firstName,
    customer.value.lastName,
  ]
    .filter(Boolean)
    .join(' ')
})
</script>

<template>
  <section
    class="mx-auto max-w-5xl px-4 sm:px-6 py-14 lg:px-8"
  >
    <NuxtLink
      to="/"
      class="text-sm font-medium text-brew-500 transition hover:text-brew-800"
    >
      ← BrewHub Home
    </NuxtLink>

    <div
      v-if="pending"
      class="mt-10"
      aria-hidden="true"
    >
      <div>
        <AppSkeleton class="h-3 w-32" />
        <AppSkeleton class="mt-4 h-10 w-72 max-w-full" />
        <AppSkeleton class="mt-4 h-5 w-80 max-w-full" />
      </div>

      <div
        class="
          mt-10
          grid
          gap-6
          lg:grid-cols-[1.4fr_1fr]
        "
      >
        <article
          class="
            rounded-3xl
            border
            border-brew-200
            bg-white
            p-4
            shadow-sm
            sm:p-8
          "
        >
          <div
            class="
              flex
              items-center
              justify-between
              gap-5
            "
          >
            <div class="flex-1">
              <AppSkeleton class="h-4 w-20" />
              <AppSkeleton class="mt-3 h-8 w-48" />
            </div>

            <AppSkeleton
              class="
                size-14
                rounded-full
              "
            />
          </div>

          <div
            class="
              mt-8
              grid
              gap-6
              sm:grid-cols-2
            "
          >
            <div
              v-for="index in 4"
              :key="index"
            >
              <AppSkeleton class="h-3 w-24" />
              <AppSkeleton class="mt-3 h-5 w-32" />
            </div>
          </div>
        </article>

        <aside
          class="
            rounded-3xl
            border
            border-brew-200
            bg-brew-50
            p-4
            sm:p-8
          "
        >
          <AppSkeleton class="h-3 w-28" />
          <AppSkeleton class="mt-4 h-8 w-56" />

          <div class="mt-7 grid gap-3">
            <AppSkeleton class="h-12 w-full rounded-xl" />
            <AppSkeleton class="h-28 w-full rounded-2xl" />
            <AppSkeleton class="h-12 w-full rounded-xl" />
          </div>
        </aside>
      </div>
    </div>

    <AppStatePanel
      v-else-if="error"
        class="mt-10"
        variant="error"
        title="Unable to load your account"
        Xmessage="BrewHub could not retrieve your customer profile. Please try again."
    />

    <template v-else-if="customer">
      <div class="mt-8">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
        >
          Customer Account
        </p>

        <h1
          class="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-brew-950"
        >
          Welcome, {{ customer.firstName }}
        </h1>

        <p
          class="mt-4 text-brew-600"
        >
          Manage your BrewHub profile
          and view your account details.
        </p>
      </div>

    <DashboardRoleDashboard role="customer" />

      <div
        class="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]"
      >
        <!-- PROFILE -->
        <article
          class="rounded-3xl border border-brew-200 bg-white p-4 sm:p-8 shadow-sm"
        >
          <div
            class="flex items-center justify-between gap-5"
          >
            <div>
              <p
                class="text-sm font-medium text-brew-500"
              >
                Profile
              </p>

              <h2
                class="mt-2 text-2xl font-semibold text-brew-950"
              >
                {{ fullName }}
              </h2>
            </div>

            <div
              class="flex h-14 w-14 items-center justify-center rounded-full bg-brew-100 text-xl font-semibold text-brew-900"
            >
              {{
                customer.firstName
                  ?.charAt(0)
                  .toUpperCase()
              }}
            </div>
          </div>

          <div
            class="mt-8 grid gap-6 sm:grid-cols-2"
          >
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wider text-brew-400"
              >
                Customer Number
              </p>

              <p
                class="mt-2 font-medium text-brew-950"
              >
                {{
                  customer.customerNo
                    ?? 'Not assigned'
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wider text-brew-400"
              >
                Status
              </p>

              <p
                class="mt-2 font-medium text-green-700"
              >
                Active
              </p>
            </div>

            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wider text-brew-400"
              >
                Email
              </p>

              <p
                class="mt-2 break-all font-medium text-brew-950"
              >
                {{
                  customer.email
                    ?? 'Not provided'
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wider text-brew-400"
              >
                Phone
              </p>

              <p
                class="mt-2 font-medium text-brew-950"
              >
                {{
                  customer.phone
                    ?? 'Not provided'
                }}
              </p>
            </div>
          </div>
        </article>

        <!-- QUICK ACTIONS -->
        <aside
          class="rounded-3xl border border-brew-200 bg-brew-50 p-4 sm:p-8"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Quick Actions
          </p>

          <h2
            class="mt-3 text-2xl font-semibold text-brew-950"
          >
            What would you like?
          </h2>

          <div class="mt-7 grid gap-3">
            <NuxtLink
              to="/catalog"
              class="rounded-xl bg-brew-800 px-5 py-3 text-center text-sm font-semibold text-white"
              style="
                background-color:
                  var(--color-brew-800);
              "
            >
              Browse Menu
            </NuxtLink>

            <NuxtLink
              to="/account/orders"
              class="
                rounded-2xl
                border border-brew-200
                bg-white
                p-5
                transition
                hover:border-brew-300
                hover:shadow-sm
              "
            >
              <p class="font-semibold text-brew-950">
                My Orders
              </p>

              <p class="mt-2 text-sm leading-6 text-brew-500">
                Review your recent orders,
                status, items, and totals.
              </p>

              <p class="mt-4 text-sm font-semibold text-brew-700">
                View order history →
              </p>
            </NuxtLink>

            <NuxtLink
              to="/account/orders"
              class="rounded-xl border border-brew-200 bg-white px-5 py-3 text-center text-sm font-semibold text-brew-800 transition hover:bg-brew-100"
            >
              My Orders
            </NuxtLink>
          </div>

          <p
            class="mt-5 text-xs leading-5 text-brew-500"
          >
            Order history will become
            available after we implement
            the Ordering domain.
          </p>
        </aside>
      </div>
    </template>

  <div
  v-if="showLeaveWarning"
  class="fixed inset-x-0 top-24 z-100 mx-auto w-full max-w-lg max-h-[calc(100dvh-7rem)] overflow-y-auto px-4 sm:px-6"
>
  <div
    class="rounded-2xl border border-brew-200 bg-white p-5 shadow-xl"
  >
    <p
      class="font-semibold text-brew-950"
    >
      Leave this page?
    </p>

    <p
      class="mt-2 text-sm leading-6 text-brew-600"
    >
      You will remain signed in.
      Use Sign out if you want to end
      your BrewHub session.
    </p>

    <div
      class="mt-4 flex flex-wrap justify-end gap-3"
    >
      <button
        type="button"
        class="rounded-xl border border-brew-200 px-4 py-2 text-sm font-medium text-brew-700"
        @click="stayOnPage"
      >
        Stay
      </button>

      <button
        type="button"
        class="rounded-xl bg-brew-900 px-4 py-2 text-sm font-semibold text-white"
        @click="continueNavigation"
      >
        Leave page
      </button>
    </div>
  </div>
</div>
</section>
</template>