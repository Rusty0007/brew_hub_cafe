<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'admin',
  ],
})

interface StaffUser {
  id: number
  username: string
  displayName: string
  email: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: string[]
}

const {
  data,
  pending,
  error,
  refresh,
} = await useFetch<{
  users: StaffUser[]
}>('/api/admin/users')

const users = computed(
  () => data.value?.users ?? [],
)
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-6 py-14 lg:px-8"
  >
    <div
      class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
        >
          Administration
        </p>

        <h1
          class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
        >
          User Management
        </h1>

        <p
          class="mt-3 text-brew-500"
        >
          Manage BrewHub administrative and
          staff accounts.
        </p>
      </div>

      <NuxtLink
        to="/admin/users/new"
        class="inline-flex items-center justify-center rounded-xl border border-brew-800 bg-brew-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brew-900"
        style="background-color: var(--color-brew-800);"
      >
        Create staff account
      </NuxtLink>
    </div>

    <div
      v-if="pending"
      class="mt-10 text-brew-500"
    >
      Loading users...
    </div>

    <div
      v-else-if="error"
      class="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
    >
      Unable to load users.
    </div>

    <div
      v-else
      class="mt-10 overflow-hidden rounded-3xl border border-brew-200 bg-white"
    >
      <table class="w-full text-left">
        <thead class="bg-brew-50">
          <tr>
            <th class="px-6 py-4 text-sm font-semibold text-brew-900">
              User
            </th>

            <th class="px-6 py-4 text-sm font-semibold text-brew-900">
              Role
            </th>

            <th class="px-6 py-4 text-sm font-semibold text-brew-900">
              Status
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-brew-100">
          <tr
            v-for="user in users"
            :key="user.id"
          >
            <td class="px-6 py-5">
              <p class="font-medium text-brew-950">
                {{ user.displayName }}
              </p>

              <p class="mt-1 text-sm text-brew-500">
                @{{ user.username }}
              </p>

              <p
                v-if="user.email"
                class="mt-1 text-sm text-brew-400"
              >
                {{ user.email }}
              </p>
            </td>

            <td class="px-6 py-5">
              <span
                v-for="role in user.roles"
                :key="role"
                class="mr-2 inline-flex rounded-full bg-brew-100 px-3 py-1 text-xs font-semibold text-brew-700"
              >
                {{ role }}
              </span>

              <span
                v-if="user.roles.length === 0"
                class="text-sm text-brew-400"
              >
                No role
              </span>
            </td>

            <td class="px-6 py-5">
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="
                  user.isActive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                "
              >
                {{
                  user.isActive
                    ? 'Active'
                    : 'Inactive'
                }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>