<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'cashier'] })
const { workspaceDestination } = useAccountAccess()
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
    <NuxtLink :to="workspaceDestination" class="inline-flex min-h-11 items-center text-sm font-semibold text-brew-700">Back to workspace</NuxtLink>
    <p class="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brew-500">Staff account</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-tight text-brew-950 sm:text-4xl">My profile</h1>
    <StaffProfilePanel />
  </section>
</template>
