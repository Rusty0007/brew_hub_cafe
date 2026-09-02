<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'cashier',
  ],
})
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-6 py-14 lg:px-8"
  >
    <p
      class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
    >
      Sales Operations
    </p>

    <h1
      class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
    >
      Cashier Workspace
    </h1>

    <p
      class="mt-4 max-w-2xl leading-7 text-brew-500"
    >
      Handle BrewHub customer orders,
      checkout, and payments.
    </p>

    <div
      class="mt-10 grid gap-6 md:grid-cols-2"
    >
      <NuxtLink
        to="/staff/pos"
        class="rounded-3xl border border-brew-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.15em] text-brew-400"
        >
          Point of Sale
        </p>

        <h2
          class="mt-3 text-xl font-semibold text-brew-950"
        >
          New Order
        </h2>

        <p
          class="mt-3 text-sm leading-6 text-brew-500"
        >
          Create a customer order and
          proceed to checkout.
        </p>
      </NuxtLink>

      <NuxtLink
        to="/staff/orders"
        class="rounded-3xl border border-brew-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.15em] text-brew-400"
        >
          Orders
        </p>

        <h2
          class="mt-3 text-xl font-semibold text-brew-950"
        >
          Recent Orders
        </h2>

        <p
          class="mt-3 text-sm leading-6 text-brew-500"
        >
          Review today's orders and
          their payment status.
        </p>
      </NuxtLink>
    </div>
  </section>
</template>