<script setup lang="ts">
import type { DashboardRole, DashboardSummary } from '#shared/types/dashboard'

const props = defineProps<{ role: DashboardRole }>()
const days = ref('7')
const { data, status, error, refresh } = await useFetch<DashboardSummary>(() => `/api/dashboard/${props.role}`, {
  query: { days },
  key: `dashboard-${props.role}`,
})
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 })
const count = new Intl.NumberFormat('en-PH')
const colors = ['#603821', '#b98b62', '#d4b896', '#5c7861', '#947268', '#794a30', '#eadfce']
const maximum = computed(() => Math.max(1, ...data.value?.trend.points.map(point => point.value) ?? []))
const total = computed(() => data.value?.breakdown.points.reduce((sum, point) => sum + point.value, 0) ?? 0)
const gradient = computed(() => {
  if (!total.value) return 'conic-gradient(#eadfce 0% 100%)'
  let offset = 0
  return `conic-gradient(${data.value?.breakdown.points.map((point, index) => {
    const start = offset
    offset += point.value / total.value * 100
    return `${colors[index % colors.length]} ${start}% ${offset}%`
  }).join(', ')})`
})
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
</script>

<template>
  <section class="my-8 min-w-0 space-y-5" aria-label="Dashboard statistics" :aria-busy="status === 'pending'">
    <div class="flex flex-col gap-4 rounded-3xl border border-brew-200 bg-brew-100/60 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brew-500">Freshly brewed insights</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-brew-950">{{ data?.title ?? 'Your dashboard' }}</h2>
        <p v-if="data" class="mt-2 max-w-2xl text-sm leading-6 text-brew-600">{{ data.scope }}</p>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex-1 text-xs font-semibold text-brew-700">
          Period
          <select v-model="days" class="mt-1 block w-full rounded-xl border border-brew-200 bg-white px-3 py-2 text-base">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <button type="button" class="rounded-xl border border-brew-300 bg-white px-4 py-2 text-sm font-semibold text-brew-800 disabled:opacity-50" :disabled="status === 'pending'" @click="refresh()">Refresh</button>
      </div>
    </div>

    <div v-if="status === 'pending'" role="status" class="rounded-3xl border border-brew-200 bg-white p-6 text-sm text-brew-600">Brewing your latest statistics…</div>
    <div v-else-if="error" role="alert" class="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      Statistics could not be loaded. Your workspace links are still available.
      <button type="button" class="mt-3 block rounded-xl border border-red-200 px-4 py-2 font-semibold" @click="refresh()">Try again</button>
    </div>
    <template v-else-if="data">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="metric in data.metrics" :key="metric.label" class="min-w-0 rounded-3xl border border-brew-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-medium text-brew-600">{{ metric.label }}</h3>
          <p class="mt-3 text-3xl font-semibold tracking-tight text-brew-950">{{ metric.money ? currency.format(metric.value) : count.format(metric.value) }}</p>
          <p class="mt-2 text-xs leading-5 text-brew-500">{{ metric.detail }}</p>
        </article>
      </div>
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <figure class="min-w-0 rounded-3xl border border-brew-200 bg-white p-4 shadow-sm sm:p-6">
          <figcaption class="font-semibold text-brew-950">{{ data.trend.title }}</figcaption>
          <p class="mt-1 text-xs text-brew-500">Daily counts · each bar starts at zero</p>
          <p v-if="!data.trend.points.some(point => point.value > 0)" class="mt-6 rounded-xl bg-brew-50 p-4 text-sm text-brew-600">No activity in this period yet.</p>
          <div v-else class="mt-6 overflow-x-auto pb-2" tabindex="0" role="region" aria-label="Daily activity chart, scroll horizontally for more dates">
            <div class="flex h-52 items-end gap-2" :style="{ minWidth: `${data.trend.points.length * 40}px` }">
              <div v-for="point in data.trend.points" :key="point.label" class="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-2">
                <span class="text-xs font-semibold text-brew-700">{{ point.value }}</span>
                <div class="w-full max-w-10 rounded-t-lg bg-brew-600" :style="{ height: `${point.value / maximum * 140}px` }" aria-hidden="true" />
                <span class="whitespace-nowrap text-[10px] text-brew-500">{{ dateLabel(point.label) }}</span>
              </div>
            </div>
          </div>
          <details class="mt-5 border-t border-brew-100 pt-3 text-sm">
            <summary class="cursor-pointer py-2 font-medium text-brew-700">View daily values</summary>
            <table class="mt-2 w-full text-left text-sm">
              <caption class="sr-only">{{ data.trend.title }}</caption>
              <thead><tr><th scope="col" class="py-2">Date</th><th scope="col" class="py-2 text-right">Count</th></tr></thead>
              <tbody><tr v-for="point in data.trend.points" :key="point.label" class="border-t border-brew-100"><th scope="row" class="py-2 font-normal">{{ dateLabel(point.label) }}</th><td class="py-2 text-right">{{ point.value }}</td></tr></tbody>
            </table>
          </details>
        </figure>
        <figure class="min-w-0 rounded-3xl border border-brew-200 bg-white p-4 shadow-sm sm:p-6">
          <figcaption class="font-semibold text-brew-950">{{ data.breakdown.title }}</figcaption>
          <div class="relative mx-auto my-6 flex size-44 items-center justify-center rounded-full" :style="{ background: gradient }" aria-hidden="true">
            <div class="flex size-32 flex-col items-center justify-center rounded-full bg-white"><span class="text-3xl font-semibold text-brew-950">{{ count.format(total) }}</span><span class="text-xs text-brew-500">Total</span></div>
          </div>
          <p v-if="!total" class="text-center text-sm text-brew-600">No data to display yet.</p>
          <ul v-else class="space-y-3 text-sm">
            <li v-for="(point, index) in data.breakdown.points" :key="point.label" class="flex items-start justify-between gap-3">
              <span class="flex min-w-0 items-center gap-2 capitalize text-brew-700"><span class="size-3 shrink-0 rounded-full" :style="{ background: colors[index % colors.length] }" aria-hidden="true" />{{ point.label }}</span>
              <span class="shrink-0 font-semibold text-brew-950">{{ count.format(point.value) }} <span class="font-normal text-brew-500">({{ Math.round(point.value / total * 100) }}%)</span></span>
            </li>
          </ul>
        </figure>
      </div>
      <p class="text-xs leading-5 text-brew-500">{{ data.note }}</p>
    </template>
  </section>
</template>
