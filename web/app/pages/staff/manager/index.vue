<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'manager',
  ],
})
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
  >
    <!-- Page heading -->
    <div class="mb-10">
      <p
        class="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800"
      >
        Management
      </p>

      <h1
        class="mt-2 text-3xl font-semibold text-stone-900"
      >
        Manager Workspace
      </h1>

      <p
        class="mt-2 max-w-2xl text-sm leading-6 text-stone-600"
      >
        Manage BrewHub Cafe catalog,
        inventory, reporting, and
        daily operations.
      </p>
    </div>

    <!-- Workspace cards -->
        <!-- Workspace cards -->
    <div
      class="grid gap-6 md:grid-cols-2"
    >
      <!-- Inventory -->
      <NuxtLink
        to="/staff/inventory"
        class="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-wide text-amber-800"
            >
              Stock
            </p>

            <h2
              class="mt-2 text-xl font-semibold text-stone-900"
            >
              Inventory
            </h2>

            <p
              class="mt-2 text-sm leading-6 text-stone-600"
            >
              Review stock levels,
              receive inventory, make
              adjustments, and inspect
              stock movement history.
            </p>
          </div>

          <span
            class="text-xl text-stone-400 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>

        <p
          class="mt-6 text-sm font-medium text-amber-800"
        >
          Manage inventory
        </p>
      </NuxtLink>

      <!-- Catalog -->
      <NuxtLink
        to="/staff/catalog"
        class="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-wide text-amber-800"
            >
              Products
            </p>

            <h2
              class="mt-2 text-xl font-semibold text-stone-900"
            >
              Catalog Management
            </h2>

            <p
              class="mt-2 text-sm leading-6 text-stone-600"
            >
              Manage products,
              categories, pricing,
              availability, and
              inventory tracking.
            </p>
          </div>

          <span
            class="text-xl text-stone-400 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>

        <p
          class="mt-6 text-sm font-medium text-amber-800"
        >
          Manage catalog
        </p>
      </NuxtLink>

      <!-- POS -->
      <NuxtLink
        to="/staff/pos"
        class="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-wide text-amber-800"
            >
              Sales
            </p>

            <h2
              class="mt-2 text-xl font-semibold text-stone-900"
            >
              Point of Sale
            </h2>

            <p
              class="mt-2 text-sm leading-6 text-stone-600"
            >
              Create cashier orders,
              reserve stock, and process
              in-store customer payments.
            </p>
          </div>

          <span
            class="text-xl text-stone-400 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>

        <p
          class="mt-6 text-sm font-medium text-amber-800"
        >
          Open POS
        </p>
      </NuxtLink>

      <!-- Recent Orders -->
      <NuxtLink
        to="/staff/orders"
        class="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-wide text-amber-800"
            >
              Orders
            </p>

            <h2
              class="mt-2 text-xl font-semibold text-stone-900"
            >
              Recent Orders
            </h2>

            <p
              class="mt-2 text-sm leading-6 text-stone-600"
            >
              Review recent POS and
              customer orders, payments,
              reservations, and order status.
            </p>
          </div>

          <span
            class="text-xl text-stone-400 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>

        <p
          class="mt-6 text-sm font-medium text-amber-800"
        >
          View recent orders
        </p>
      </NuxtLink>

      <!-- Reports -->
      <NuxtLink
        to="/staff/manager/reports"
        class="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-wide text-amber-800"
            >
              Analytics
            </p>

            <h2
              class="mt-2 text-xl font-semibold text-stone-900"
            >
              Reports
            </h2>

            <p
              class="mt-2 text-sm leading-6 text-stone-600"
            >
              Review today's sales,
              completed orders, payment
              activity, refunds, and
              low-stock alerts.
            </p>
          </div>

          <span
            class="text-xl text-stone-400 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>

        <p
          class="mt-6 text-sm font-medium text-amber-800"
        >
          View reports
        </p>
      </NuxtLink>
    </div>
  </section>
</template>