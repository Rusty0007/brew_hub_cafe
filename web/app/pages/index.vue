<script setup lang="ts">
definePageMeta({
  layout: false,
})

const {
  loggedIn,
  user,
} = useUserSession()



const accountDestination = computed(() => {
  const roles =
    (user.value as any)?.roles ?? []

  if (roles.includes('ADMIN')) {
    return '/admin'
  }

  if (roles.includes('MANAGER')) {
    return '/staff/manager'
  }

  if (roles.includes('CASHIER')) {
    return '/staff/cashier'
  }

  return '/account'
})

const accountLabel = computed(() => {
  const roles =
    (user.value as any)?.roles ?? []

  if (
    roles.includes('ADMIN')
    || roles.includes('MANAGER')
    || roles.includes('CASHIER')
  ) {
    return 'Staff Workspace'
  }

  return 'My Account'
})
</script>

<template>
  <div class="min-h-screen bg-brew-50 text-brew-950">
    <!-- HERO -->
    <section
      class="relative min-h-screen overflow-hidden"
      style="
        background-image: url('/images/landing/Desktop-Size.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      "
    >
      <!--
        Warm overlay:
        makes the left side readable while preserving
        the coffee image on the right.
      -->
      <div
        class="absolute inset-0"
        style="
          background:
            linear-gradient(
              90deg,
              rgba(252, 250, 247, 0.96) 0%,
              rgba(252, 250, 247, 0.90) 25%,
              rgba(252, 250, 247, 0.55) 48%,
              rgba(252, 250, 247, 0.08) 72%,
              rgba(252, 250, 247, 0) 100%
            );
        "
      />

      <!-- NAVIGATION -->
      <header
        class="relative z-20 border-b border-brew-900/10"
      >
        <div
          class="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8"
        >
          <!-- BRAND -->
          <NuxtLink
            to="/"
            class="flex items-center gap-4"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-brew-900 text-lg font-semibold text-white"
            >
              B
            </div>

            <div>
              <p
                class="text-xl font-semibold tracking-wide text-brew-950"
              >
                BrewHub Cafe
              </p>

              <p
                class="text-xs uppercase tracking-[0.2em] text-brew-600"
              >
                Coffee & comfort
              </p>
            </div>
          </NuxtLink>

          <!-- DESKTOP NAV -->
          <nav
            class="hidden items-center gap-9 text-sm font-medium lg:flex"
          >
            <NuxtLink
              to="/"
              class="text-brew-800 transition hover:text-brew-950"
            >
              Home
            </NuxtLink>

            <NuxtLink
              to="/catalog"
              class="text-brew-700 transition hover:text-brew-950"
            >
              Menu
            </NuxtLink>

            <a
              href="#story"
              class="text-brew-700 transition hover:text-brew-950"
            >
              Our Story
            </a>

            <a
              href="#visit"
              class="text-brew-700 transition hover:text-brew-950"
            >
              Visit
            </a>
          </nav>

          <!-- STAFF CTA -->
            <!-- ACCOUNT ACTIONS -->
<div
  v-if="!loggedIn"
  class="hidden items-center gap-3 sm:flex"
>
  <!-- CUSTOMER REGISTRATION -->
          <NuxtLink
            to="/register"
            class="inline-flex items-center justify-center rounded-full border border-brew-700 bg-brew-50/70 px-5 py-3 text-sm font-semibold text-brew-900 backdrop-blur-sm transition hover:bg-brew-100"
          >
            Create Account
          </NuxtLink>
        
          <!-- STAFF LOGIN -->
          <NuxtLink
            to="/login"
            class="inline-flex items-center justify-center rounded-full border border-brew-800 bg-brew-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style="background-color: var(--color-brew-800);"
          >
            Sign In
          </NuxtLink>
        </div>
        
        <!-- AUTHENTICATED STAFF -->
        <NuxtLink
          v-else
          :to="accountDestination"
          class="hidden rounded-full border border-brew-800 bg-brew-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:inline-flex"
          style="background-color: var(--color-brew-800);"
        >
          {{ accountLabel }}
        </NuxtLink>
        </div>
      </header>

      <!-- HERO CONTENT -->
      <div
        class="relative z-10 mx-auto flex max-w-7xl items-center px-6 pb-24 pt-24 lg:min-h-180 lg:px-8 lg:pb-32 lg:pt-20"
      >
        <div class="max-w-2xl">
          <p
            class="text-sm font-semibold uppercase tracking-[0.28em] text-brew-600"
          >
            Good coffee. Great moments.
          </p>

          <h1
            class="mt-6 font-semibold leading-none tracking-tight text-brew-950"
            style="
              font-size:
                clamp(
                  3.8rem,
                  7vw,
                  6.6rem
                );
            "
          >
            Brewed for
            <span class="block">
              every moment.
            </span>
          </h1>

          <!-- Decorative divider -->
          <div
            class="mt-8 flex items-center gap-4 text-brew-500"
          >
            <span
              class="block h-px w-12 bg-brew-400"
            />

            <span
              class="text-lg"
            >
              ◆
            </span>

            <span
              class="block h-px w-12 bg-brew-400"
            />
          </div>

          <p
            class="mt-7 max-w-xl text-lg leading-8 text-brew-700"
          >
            From carefully brewed coffee to
            comforting cafe favorites, BrewHub
            brings together quality, warmth,
            and everyday moments worth enjoying.
          </p>

          <!-- CTA -->
          <div
            class="mt-10 flex flex-wrap gap-4"
          >
            <NuxtLink
              to="/catalog"
              class="inline-flex items-center gap-3 rounded-xl bg-brew-800 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brew-900 hover:shadow-xl"
              style="background-color: var(--color-brew-800);"
            >
              View Menu

              <span aria-hidden="true">
                →
              </span>
            </NuxtLink>

            <a
              href="#visit"
              class="inline-flex items-center gap-3 rounded-xl border border-brew-500 bg-brew-50/70 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-brew-900 backdrop-blur-sm transition hover:bg-brew-100"
            >
              Visit BrewHub
            </a>
          </div>
        </div>
      </div>

      <!-- SCROLL INDICATOR -->
      <a
        href="#experience"
        class="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.2em] text-brew-700 lg:flex"
      >
        Explore

        <span class="text-lg">
          ↓
        </span>
      </a>
    </section>

    <!-- EXPERIENCE STRIP -->
    <section
      id="experience"
      class="border-y border-brew-200 bg-brew-50"
    >
      <div
        class="mx-auto grid max-w-7xl gap-0 px-6 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8"
      >
        <article
          class="border-brew-200 px-6 py-5 lg:border-r"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Quality
          </p>

          <h2
            class="mt-3 text-xl font-semibold text-brew-950"
          >
            Thoughtfully Brewed
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-brew-600"
          >
            Coffee prepared with care for
            a consistently satisfying cup.
          </p>
        </article>

        <article
          class="border-brew-200 px-6 py-5 lg:border-r"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Fresh
          </p>

          <h2
            class="mt-3 text-xl font-semibold text-brew-950"
          >
            Cafe Favorites
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-brew-600"
          >
            Drinks and bites made for your
            everyday coffee break.
          </p>
        </article>

        <article
          class="border-brew-200 px-6 py-5 lg:border-r"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            Comfort
          </p>

          <h2
            class="mt-3 text-xl font-semibold text-brew-950"
          >
            Warm Atmosphere
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-brew-600"
          >
            A relaxed place to recharge,
            connect, and enjoy the moment.
          </p>
        </article>

        <article
          class="px-6 py-5"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
          >
            BrewHub
          </p>

          <h2
            class="mt-3 text-xl font-semibold text-brew-950"
          >
            Made for Everyone
          </h2>

          <p
            class="mt-2 text-sm leading-6 text-brew-600"
          >
            Whether staying awhile or grabbing
            coffee to go, you're welcome here.
          </p>
        </article>
      </div>
    </section>

    <!-- STORY -->
    <section
      id="story"
      class="bg-white"
    >
      <div
        class="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-32"
      >
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.22em] text-brew-500"
          >
            The BrewHub Experience
          </p>

          <h2
            class="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-brew-950 md:text-5xl"
          >
            More than coffee.
            A place to belong.
          </h2>
        </div>

        <div>
          <p
            class="text-lg leading-8 text-brew-600"
          >
            BrewHub Cafe is built around simple
            things done well: welcoming service,
            satisfying drinks, fresh cafe
            favorites, and an atmosphere that
            feels comfortable from the moment
            you arrive.
          </p>

          <NuxtLink
            to="/catalog"
            class="mt-8 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-brew-800"
          >
            Explore our menu
            <span>→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FEATURED MENU -->
    <section
      class="border-y border-brew-200 bg-brew-100"
    >
      <div
        class="mx-auto max-w-7xl px-6 py-24 lg:px-8"
      >
        <div
          class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.22em] text-brew-500"
            >
              BrewHub Menu
            </p>

            <h2
              class="mt-4 text-4xl font-semibold tracking-tight text-brew-950"
            >
              Find your favorite.
            </h2>
          </div>

          <NuxtLink
            to="/catalog"
            class="text-sm font-semibold uppercase tracking-[0.16em] text-brew-800"
          >
            View full menu →
          </NuxtLink>
        </div>

        <div
          class="mt-12 grid gap-5 md:grid-cols-3"
        >
          <NuxtLink
            to="/catalog"
            class="group rounded-3xl border border-brew-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-md"
          >
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-brew-400"
            >
              Coffee
            </p>

            <h3
              class="mt-4 text-2xl font-semibold text-brew-950"
            >
              Crafted Coffee
            </h3>

            <p
              class="mt-3 text-sm leading-6 text-brew-600"
            >
              Espresso classics, creamy lattes,
              and comforting brewed favorites.
            </p>

            <p
              class="mt-7 text-sm font-semibold text-brew-800"
            >
              Browse coffee →
            </p>
          </NuxtLink>

          <NuxtLink
            to="/catalog"
            class="group rounded-3xl border border-brew-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-md"
          >
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-brew-400"
            >
              Refresh
            </p>

            <h3
              class="mt-4 text-2xl font-semibold text-brew-950"
            >
              Iced & Cold
            </h3>

            <p
              class="mt-3 text-sm leading-6 text-brew-600"
            >
              Cool coffee, refreshing teas,
              and drinks made for warmer days.
            </p>

            <p
              class="mt-7 text-sm font-semibold text-brew-800"
            >
              Browse drinks →
            </p>
          </NuxtLink>

          <NuxtLink
            to="/catalog"
            class="group rounded-3xl border border-brew-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-md"
          >
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-brew-400"
            >
              Pairings
            </p>

            <h3
              class="mt-4 text-2xl font-semibold text-brew-950"
            >
              Pastries & Bites
            </h3>

            <p
              class="mt-3 text-sm leading-6 text-brew-600"
            >
              Easy cafe bites made to pair
              perfectly with your favorite cup.
            </p>

            <p
              class="mt-7 text-sm font-semibold text-brew-800"
            >
              Browse food →
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- VISIT -->
    <section
      id="visit"
      class="bg-brew-900 text-brew-50"
    >
      <div
        class="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-end lg:px-8"
      >
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.22em] text-brew-300"
          >
            Visit BrewHub
          </p>

          <h2
            class="mt-5 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl"
          >
            Your next coffee
            moment starts here.
          </h2>

          <p
            class="mt-6 max-w-xl text-lg leading-8 text-brew-200"
          >
            Drop by, discover your favorite
            drink, and make BrewHub part of
            your everyday routine.
          </p>
        </div>

        <div
          class="flex flex-wrap gap-4 lg:justify-end"
        >
          <NuxtLink
            to="/catalog"
            class="rounded-xl bg-brew-100 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-brew-950"
          >
            View Menu
          </NuxtLink>

          <NuxtLink
            v-if="!loggedIn"
            to="/login"
            class="rounded-xl border border-brew-600 px-7 py-4 text-sm font-semibold uppercase tracking-wide text-brew-100 transition hover:bg-brew-800"
          >
            Sign In
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer
      class="border-t border-brew-800 bg-brew-950"
    >
      <div
        class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-sm text-brew-300 sm:flex-row sm:items-center sm:justify-between lg:px-8"
      >
        <div>
          <p
            class="font-semibold text-brew-100"
          >
            BrewHub Cafe
          </p>

          <p class="mt-1">
            Coffee & comfort.
          </p>
        </div>

        <p>
          Ordering & Inventory Management System
        </p>
      </div>
    </footer>
  </div>
</template>