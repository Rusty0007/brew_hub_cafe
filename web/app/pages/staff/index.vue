<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

interface CurrentUser {
  id: number
  username: string
  displayName: string
  email: string | null
  roles: string[]
}

interface MeResponse {
  user: CurrentUser
}

const {
  data,
  error,
  pending,
} = await useFetch<MeResponse>('/api/auth/me')

const currentUser = computed(() => {
  return data.value?.user ?? null
})
</script>

<template>
  <section class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <p class="text-sm font-semibold uppercase tracking-wider text-brew-500">
      Staff
    </p>

    <h1 class="mt-3 text-4xl font-semibold text-brew-950">
      BrewHub Workspace
    </h1>

    <div
      v-if="pending"
      class="mt-8 text-brew-500"
    >
      Loading account...
    </div>

    <div
      v-else-if="error"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
    >
      Unable to load your staff account.
    </div>

    <div
      v-else-if="currentUser"
      class="mt-8 max-w-xl rounded-3xl border border-brew-200 bg-white p-6"
    >
      <p class="text-sm text-brew-500">
        Signed in as
      </p>

      <h2 class="mt-1 text-xl font-semibold text-brew-900">
        {{ currentUser.displayName }}
      </h2>

      <p class="mt-4 text-sm text-brew-600">
        Username: {{ currentUser.username }}
      </p>

      <p class="mt-2 text-sm text-brew-600">
        Email: {{ currentUser.email ?? '—' }}
      </p>

      <p class="mt-2 text-sm text-brew-600">
        Roles:
        {{
          currentUser.roles.length
            ? currentUser.roles.join(', ')
            : 'No role assigned'
        }}
      </p>
    </div>
  </section>
</template>