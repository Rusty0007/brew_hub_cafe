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

type EditableStaffRole =
  | 'CASHIER'
  | 'MANAGER'

const editingUserId =
  ref<number | null>(null)

const selectedRole =
  ref<EditableStaffRole>(
    'CASHIER',
  )

const roleChangeReason =
  ref('')

const updatingRole =
  ref(false)

const roleUpdateError =
  ref('')

const roleUpdateSuccess =
  ref('')

function getEditableRole(
  user: StaffUser,
): EditableStaffRole | null {
  if (user.roles.length !== 1) {
    return null
  }

  const role =
    user.roles[0]

  if (
    role !== 'CASHIER'
    && role !== 'MANAGER'
  ) {
    return null
  }

  return role
}

async function startRoleEdit(
  user: StaffUser,
) {
  const role =
    getEditableRole(user)

  if (!role) {
    return
  }

  editingUserId.value =
    user.id

  selectedRole.value =
    role

  roleChangeReason.value =
    ''

  roleUpdateError.value =
    ''

  roleUpdateSuccess.value =
    ''

  await nextTick()

  document
    .getElementById(
      'role-change-editor',
    )
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

function cancelRoleEdit() {
  editingUserId.value =
    null

  roleChangeReason.value =
    ''

  roleUpdateError.value =
    ''
}

async function updateRole(
  user: StaffUser,
) {
  const currentRole =
    getEditableRole(user)

  const reason =
    roleChangeReason.value.trim()

  roleUpdateError.value =
    ''

  roleUpdateSuccess.value =
    ''

  if (!currentRole) {
    roleUpdateError.value =
      'This account role cannot be changed.'

    return
  }

  if (
    selectedRole.value
    === currentRole
  ) {
    roleUpdateError.value =
      'Select a different role.'

    return
  }

  if (reason.length < 3) {
    roleUpdateError.value =
      'Please enter a role change reason.'

    return
  }

  const confirmed =
    window.confirm(
      `Change ${user.displayName}'s role from ${currentRole} to ${selectedRole.value}?`,
    )

  if (!confirmed) {
    return
  }

  updatingRole.value =
    true

  try {
    await $fetch(
      `/api/admin/users/${user.id}`,
      {
        method: 'PATCH',

        body: {
          role:
            selectedRole.value,

          reason,
        },
      },
    )

    roleUpdateSuccess.value =
      `${user.displayName}'s role was updated successfully.`

    editingUserId.value =
      null

    roleChangeReason.value =
      ''

    await refresh()
  }
  catch (error: unknown) {
    roleUpdateError.value =
      getApiErrorMessage(
      error,
      'Unable to update user role.',
    )
  }
  finally {
    updatingRole.value =
      false
  }
}

const users = computed(
  () => data.value?.users ?? [],
)
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-4 sm:px-6 py-14 lg:px-8"
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
          class="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-brew-950"
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
      class="mt-10 overflow-x-auto rounded-3xl border border-brew-200 bg-white"
     tabindex="0" role="region" aria-label="User accounts, scroll horizontally for more columns">
      <table class="w-full min-w-175 text-left">
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

            <th class="px-6 py-4 text-sm font-semibold text-brew-900">
              Action
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
                <NuxtLink v-if="user.roles.some(role => ['CASHIER', 'MANAGER'].includes(role))" :to="`/admin/users/${user.id}`" class="underline decoration-brew-300 underline-offset-4 hover:text-brew-600">{{ user.displayName }}</NuxtLink>
                <span v-else>{{ user.displayName }}</span>
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

            <td class="px-6 py-5">
              <button
                v-if="getEditableRole(user)"
                type="button"
                class="rounded-xl border border-brew-200 px-4 py-2 text-sm font-semibold text-brew-800 transition hover:bg-brew-50"
                @click="startRoleEdit(user)"
              >
                Manage role
              </button>

              <span
                v-else
                class="text-sm text-brew-400"
              >
                Protected
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="editingUserId !== null"
      id="role-change-editor"
      class="mt-6 rounded-3xl border border-brew-200 bg-white p-4 sm:p-6 shadow-sm"
    >
      <h2
        class="text-xl font-semibold text-brew-950"
      >
        Change Staff Role
      </h2>

      <p
        class="mt-2 text-sm leading-6 text-brew-500"
      >
        Changing a staff role affects system
        permissions and will be recorded in the
        audit trail.
      </p>

      <div class="mt-5">
        <label class="block">
          <span
            class="text-sm font-medium text-brew-900"
          >
            New role
          </span>

          <select
            v-model="selectedRole"
            class="mt-2 w-full rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none focus:border-brew-500"
          >
            <option value="CASHIER">
              Cashier
            </option>

            <option value="MANAGER">
              Manager
            </option>
          </select>
        </label>
      </div>

      <label class="mt-5 block">
        <span
          class="text-sm font-medium text-brew-900"
        >
          Reason
        </span>

        <p
          class="mt-1 text-sm text-brew-500"
        >
          Required because permission changes
          must not occur silently.
        </p>

        <textarea
          v-model.trim="roleChangeReason"
          rows="3"
          maxlength="500"
          required
          placeholder="Example: Promoted to branch operations manager"
          class="mt-2 w-full resize-none rounded-xl border border-brew-200 bg-brew-50 px-4 py-3 text-brew-950 outline-none focus:border-brew-500"
        />
      </label>

      <p
        v-if="roleUpdateError"
        class="mt-4 text-sm font-medium text-red-600"
      >
        {{ roleUpdateError }}
      </p>

      <div
        class="mt-6 flex flex-wrap gap-3"
      >
        <button
          type="button"
          :disabled="updatingRole"
          class="rounded-xl bg-brew-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brew-900 disabled:cursor-not-allowed disabled:opacity-50"
          @click="
            () => {
              const user =
                users.find(
                  item =>
                    item.id === editingUserId,
                )

              if (user) {
                updateRole(user)
              }
            }
          "
        >
          {{
            updatingRole
              ? 'Updating...'
              : 'Update role'
          }}
        </button>

        <button
          type="button"
          :disabled="updatingRole"
          class="rounded-xl border border-brew-200 px-5 py-2.5 text-sm font-semibold text-brew-700"
          @click="cancelRoleEdit"
        >
          Cancel
        </button>
      </div>
    </div>

    <div
      v-if="roleUpdateSuccess"
      class="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
    >
      {{ roleUpdateSuccess }}
    </div>
  </section>
</template>
