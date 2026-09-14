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
    class="
      mx-auto
      max-w-7xl
      px-4
      py-10
      sm:px-6
      sm:py-14
      lg:px-8
    "
  >
    <p
      class="
        text-xs
        font-semibold
        uppercase
        tracking-[0.18em]
        text-brew-500
      "
    >
      Sales Operations
    </p>

    <h1
      class="
        mt-3
        text-3xl
        font-semibold
        tracking-tight
        text-brew-950
        sm:text-4xl
      "
    >
      Cashier Workspace
    </h1>

    <p
      class="
        mt-3
        max-w-2xl
        leading-7
        text-brew-500
        sm:mt-4
      "
    >
      Handle BrewHub customer orders,
      checkout, and payments.
    </p>

    <NuxtLink
      to="/staff/profile"
      class="
        mt-4
        inline-flex
        min-h-11
        items-center
        rounded-xl
        border
        border-brew-200
        bg-white
        px-4
        py-2
        text-sm
        font-semibold
        text-brew-800
        transition
        hover:bg-brew-50
        sm:mt-5
      "
    >
      My staff profile
    </NuxtLink>

    <!-- PRIMARY CASHIER ACTIONS -->
    <div
      class="
        mt-8
        grid
        gap-4
        md:grid-cols-2
      "
    >
      <NuxtLink
        to="/staff/pos"
        class="
          rounded-3xl
          border
          border-brew-200
          bg-white
          p-5
          shadow-sm
          transition
          hover:-translate-y-1
          hover:shadow-md
          sm:p-6
        "
      >
        <p
          class="
            text-xs
            font-semibold
            uppercase
            tracking-[0.15em]
            text-brew-400
          "
        >
          Point of Sale
        </p>

        <h2
          class="
            mt-3
            text-xl
            font-semibold
            text-brew-950
          "
        >
          New Order
        </h2>

        <p
          class="
            mt-2
            text-sm
            leading-6
            text-brew-500
          "
        >
          Create a customer order and
          proceed to checkout.
        </p>

        <p
          class="
            mt-4
            text-sm
            font-semibold
            text-brew-800
          "
        >
          Start order →
        </p>
      </NuxtLink>

      <NuxtLink
        to="/staff/orders"
        class="
          rounded-3xl
          border
          border-brew-200
          bg-white
          p-5
          shadow-sm
          transition
          hover:-translate-y-1
          hover:shadow-md
          sm:p-6
        "
      >
        <p
          class="
            text-xs
            font-semibold
            uppercase
            tracking-[0.15em]
            text-brew-400
          "
        >
          Orders
        </p>

        <h2
          class="
            mt-3
            text-xl
            font-semibold
            text-brew-950
          "
        >
          Recent Orders
        </h2>

        <p
          class="
            mt-2
            text-sm
            leading-6
            text-brew-500
          "
        >
          Review today's orders and
          their payment status.
        </p>

        <p
          class="
            mt-4
            text-sm
            font-semibold
            text-brew-800
          "
        >
          View orders →
        </p>
      </NuxtLink>
    </div>

    <!-- ANALYTICS DASHBOARD -->
    <DashboardRoleDashboard
      role="cashier"
    />
  </section>
</template>