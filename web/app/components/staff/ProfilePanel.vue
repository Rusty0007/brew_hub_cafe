<script setup lang="ts">

const {
  $csrfFetch,
} = useNuxtApp()

interface StaffProfile {
  id: number
  username: string
  displayName: string
  email: string | null
  roles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

const props = defineProps<{ userId?: number }>()
const endpoint = computed(() => props.userId ? `/api/admin/users/${props.userId}/profile` : '/api/staff/profile')
const { data, status, error, refresh } = await useFetch<{ profile: StaffProfile }>(endpoint)
const profile = computed(() => data.value?.profile)
const canEdit = computed(() => !!props.userId && profile.value?.roles.length === 1 && ['MANAGER', 'CASHIER'].includes(profile.value.roles[0]!))
const form = reactive({ displayName: '', email: '', reason: '', updatedAt: '' })
watch(profile, (value) => {
  if (value) Object.assign(form, { displayName: value.displayName, email: value.email ?? '', reason: '', updatedAt: value.updatedAt })
}, { immediate: true })
const saving = ref(false)
const message = ref('')
const saveError = ref('')
function date(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value)) : 'Not recorded'
}
async function save() {
  saving.value = true
  message.value = ''
  saveError.value = ''
  try {
    data.value = await $csrfFetch<{ profile: StaffProfile }>(endpoint.value, { method: 'PATCH', body: { ...form } })
    message.value = 'Profile updated. The change and its reason have been recorded.'
  }
  catch (cause) {
    saveError.value = getApiErrorMessage(cause, 'Unable to update this profile.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mt-8 space-y-6">
    <p v-if="status === 'pending'" role="status" class="rounded-3xl border border-brew-200 bg-white p-6 text-brew-600">Loading staff profile…</p>
    <div v-else-if="error" role="alert" class="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
      Unable to load this staff profile.
      <button type="button" class="mt-3 block rounded-xl border border-red-200 px-4 py-2" @click="refresh()">Retry</button>
    </div>
    <template v-else-if="profile">
      <section class="rounded-3xl border border-brew-200 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex size-16 shrink-0 items-center justify-center rounded-full bg-brew-100 text-2xl font-semibold text-brew-800" aria-hidden="true">{{ profile.displayName.trim().slice(0, 1).toUpperCase() }}</div>
          <div class="min-w-0 flex-1">
            <h2 class="text-2xl font-semibold text-brew-950">{{ profile.displayName }}</h2>
            <p class="mt-1 text-sm text-brew-500">@{{ profile.username }} · Staff ID {{ profile.id }}</p>
          </div>
          <span class="rounded-full px-3 py-2 text-sm font-semibold" :class="profile.isActive ? 'bg-green-50 text-green-800' : 'bg-stone-100 text-stone-700'">{{ profile.isActive ? 'Active account' : 'Inactive account' }}</span>
        </div>
        <dl class="mt-6 grid grid-cols-1 gap-5 border-t border-brew-100 pt-6 sm:grid-cols-2">
          <div><dt class="text-xs uppercase tracking-wide text-brew-500">Assigned role</dt><dd class="mt-2 font-medium text-brew-900">{{ profile.roles.join(', ') }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-brew-500">Contact email</dt><dd class="mt-2 font-medium text-brew-900">{{ profile.email || 'Not provided' }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-brew-500">Account created</dt><dd class="mt-2 text-sm text-brew-900">{{ date(profile.createdAt) }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-brew-500">Last sign-in</dt><dd class="mt-2 text-sm text-brew-900">{{ date(profile.lastLoginAt) }}</dd></div>
        </dl>
        <p class="mt-5 text-xs text-brew-500">Times shown in Asia/Manila. Account creation is not an employment start date.</p>
      </section>
      <section class="rounded-3xl border border-brew-200 bg-brew-100/60 p-4 sm:p-6">
        <h2 class="text-lg font-semibold text-brew-950">Your role at BrewHub</h2>
        <p v-if="profile.roles.includes('CASHIER')" class="mt-3 text-sm leading-7 text-brew-700">Cashier: create orders, process payments, and review your own order statistics. Keep your account individual so activity can be traced to you.</p>
        <p v-if="profile.roles.includes('MANAGER')" class="mt-3 text-sm leading-7 text-brew-700">Manager: oversee catalog and prices, inventory, order operations, refunds, and branch reports. Staff roles are managed by an administrator.</p>
        <p class="mt-3 text-sm leading-7 text-brew-600">Your staff ID stays the same when your contact details change. Contact an administrator to correct your profile or access.</p>
      </section>
      <form v-if="canEdit" class="rounded-3xl border border-brew-200 bg-white p-4 shadow-sm sm:p-6" @submit.prevent="save">
        <h2 class="text-lg font-semibold text-brew-950">Edit staff identity and contact</h2>
        <p class="mt-2 text-sm leading-6 text-brew-500">Name and contact corrections are recorded with your administrator identity and reason.</p>
        <fieldset :disabled="saving" class="mt-6 space-y-5">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label class="text-sm font-medium text-brew-800">Display name<input v-model="form.displayName" required maxlength="120" autocomplete="off" class="mt-2 w-full rounded-xl border border-brew-200 px-4 py-3 text-base"></label>
            <label class="text-sm font-medium text-brew-800">Contact email (optional)<input v-model="form.email" type="email" maxlength="255" autocomplete="off" class="mt-2 w-full rounded-xl border border-brew-200 px-4 py-3 text-base"></label>
          </div>
          <label class="block text-sm font-medium text-brew-800">Reason for correction<textarea v-model="form.reason" required minlength="3" maxlength="500" rows="3" class="mt-2 w-full rounded-xl border border-brew-200 px-4 py-3 text-base" /></label>
          <div v-if="saveError" role="alert" class="text-sm text-red-700">{{ saveError }} <button type="button" class="underline" @click="refresh()">Reload profile</button></div>
          <p v-if="message" role="status" class="text-sm text-green-800">{{ message }}</p>
          <button type="submit" class="rounded-xl bg-brew-800 px-5 py-3 font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save profile' }}</button>
        </fieldset>
      </form>
    </template>
  </div>
</template>
