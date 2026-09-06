<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
const route = useRoute()
const userId = computed(() => Number(route.params.id))
if (!Number.isSafeInteger(userId.value) || userId.value <= 0) throw createError({ statusCode: 404, statusMessage: 'Staff profile not found' })
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
    <NuxtLink to="/admin/users" class="inline-flex min-h-11 items-center text-sm font-semibold text-brew-700">Back to user management</NuxtLink>
    <p class="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brew-500">Administration</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-tight text-brew-950 sm:text-4xl">Staff profile</h1>
    <StaffProfilePanel :key="userId" :user-id="userId" />
  </section>
</template>
