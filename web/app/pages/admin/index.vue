<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'admin',
  ],
})
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-4 sm:px-6 py-14 lg:px-8"
  >
    <div class="mb-10">
      <p
        class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
      >
        Administration
      </p>

      <h1
        class="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-brew-950"
      >
        Admin Dashboard
      </h1>

      <p
        class="mt-4 max-w-2xl leading-7 text-brew-500"
      >
        Manage BrewHub staff accounts, roles,
        access, and system observability.
      </p>
    </div>

    <DashboardRoleDashboard role="admin" />

    <div
      class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      <NuxtLink
        to="/admin/users"
        class="rounded-3xl border border-brew-200 bg-white p-4 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <h2
          class="text-xl font-semibold text-brew-950"
        >
          User Management
        </h2>

        <p
          class="mt-3 text-sm leading-6 text-brew-500"
        >
          Create staff accounts, manage roles,
          control account access, and review
          protected or inactive accounts.
        </p>
      </NuxtLink>

      <NuxtLink
        to="/admin/observability"
        class="group rounded-3xl border border-brew-200 bg-white p-4 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <div
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-brew-500"
            >
              Observability
            </p>
          
            <h2
              class="mt-2 text-xl font-semibold text-brew-950"
            >
              System Activity
            </h2>
          
            <p
              class="mt-3 text-sm leading-6 text-brew-500"
            >
              Review request activity, telemetry
              events, trace IDs, performance data,
              security events, and system context.
            </p>
          </div>
        
          <span
            class="text-xl text-brew-300 transition group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      
        <p
          class="mt-6 text-sm font-semibold text-brew-700"
        >
          View system activity
        </p>
      </NuxtLink>

      <div
        class="rounded-3xl border border-brew-200 bg-white p-4 sm:p-6 shadow-sm"
      >
        <h2
          class="text-xl font-semibold text-brew-950"
        >
          System
        </h2>

        <p
          class="mt-3 text-sm leading-6 text-brew-500"
        >
          Administrative controls and future
          system configuration.
        </p>
      </div>
    </div>
  </section>
</template>