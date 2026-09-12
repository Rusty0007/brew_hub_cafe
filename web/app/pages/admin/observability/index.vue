<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    'admin',
  ],
})

interface RequestLog {
  id: number

  requestId: string
  traceId: string

  userId: number | null
  branchId: number | null
  orderId: number | null

  method: string
  path: string

  statusCode: number
  durationMs: number

  startedAt: string
  completedAt: string
}

interface TelemetryEvent {
  id: number

  eventName: string

  requestId: string | null
  traceId: string | null

  userId: number | null
  branchId: number | null
  orderId: number | null

  source: string | null
  result: string | null

  metadata:
    Record<string, unknown>

  createdAt: string
}

const activityView =
  ref<
    | 'REQUESTS'
    | 'EVENTS'
  >('REQUESTS')

const search =
  ref('')

const statusFilter =
  ref<
    | 'ALL'
    | 'SUCCESS'
    | 'CLIENT_ERROR'
    | 'SERVER_ERROR'
  >('ALL')

const telemetrySourceFilter =
  ref('ALL')

const telemetryResultFilter =
  ref('ALL')

const manualRefreshing =
  ref(false)

const OBSERVABILITY_REFRESH_INTERVAL_MS =
  10000

let observabilityRefreshTimer:
  number | null =
    null

const {
  data,
  pending,
  error,
  refresh,
} =
  await useFetch<{
    requestLogs: RequestLog[]
  }>(
    '/api/admin/observability/request-logs',
    {
      query: {
        limit: 200,
      },
    },
  )

  const {
  data: telemetryData,
  pending: telemetryPending,
  error: telemetryError,
  refresh: refreshTelemetry,
} =
  await useFetch<{
    telemetryEvents:
      TelemetryEvent[]
  }>(
    '/api/admin/observability/telemetry-events',
    {
      query: {
        limit: 200,
      },
    },
  )

  const telemetryEvents =
  computed(
    () =>
      telemetryData.value
        ?.telemetryEvents
      ?? [],
  )


const requestLogs =
  computed(
    () =>
      data.value?.requestLogs
      ?? [],
  )

const filteredLogs =
  computed(() => {
    const term =
      search.value
        .trim()
        .toLowerCase()

    return requestLogs.value.filter(
      (log) => {
        const matchesSearch =
          !term
          || log.path
            .toLowerCase()
            .includes(term)
          || log.method
            .toLowerCase()
            .includes(term)
          || log.traceId
            .toLowerCase()
            .includes(term)
          || log.requestId
            .toLowerCase()
            .includes(term)
          || String(
            log.userId ?? '',
          ).includes(term)
          || String(
            log.orderId ?? '',
          ).includes(term)

        if (!matchesSearch) {
          return false
        }

        if (
          statusFilter.value
          === 'SUCCESS'
        ) {
          return (
            log.statusCode >= 200
            && log.statusCode < 400
          )
        }

        if (
          statusFilter.value
          === 'CLIENT_ERROR'
        ) {
          return (
            log.statusCode >= 400
            && log.statusCode < 500
          )
        }

        if (
          statusFilter.value
          === 'SERVER_ERROR'
        ) {
          return (
            log.statusCode >= 500
          )
        }

        return true
      },
    )
  })

const telemetrySources =
  computed(() => {
    return [
      ...new Set(
        telemetryEvents.value
          .map(
            event =>
              event.source,
          )
          .filter(
            (
              source,
            ): source is string =>
              Boolean(source),
          ),
      ),
    ].sort()
  })

const telemetryResults =
  computed(() => {
    return [
      ...new Set(
        telemetryEvents.value
          .map(
            event =>
              event.result,
          )
          .filter(
            (
              result,
            ): result is string =>
              Boolean(result),
          ),
      ),
    ].sort()
  })

const filteredTelemetryEvents =
  computed(() => {
    const term =
      search.value
        .trim()
        .toLowerCase()

    return telemetryEvents.value.filter(
      (event) => {
        const matchesSearch =
          !term
          || event.eventName
            .toLowerCase()
            .includes(term)
          || (
            event.traceId
            ?.toLowerCase()
            .includes(term)
            ?? false
          )
          || (
            event.requestId
            ?.toLowerCase()
            .includes(term)
            ?? false
          )
          || (
            event.source
            ?.toLowerCase()
            .includes(term)
            ?? false
          )
          || (
            event.result
            ?.toLowerCase()
            .includes(term)
            ?? false
          )
          || String(
            event.userId ?? '',
          ).includes(term)
          || String(
            event.branchId ?? '',
          ).includes(term)
          || String(
            event.orderId ?? '',
          ).includes(term)

        const matchesSource =
          telemetrySourceFilter.value
            === 'ALL'
          || event.source
            === telemetrySourceFilter.value

        const matchesResult =
          telemetryResultFilter.value
            === 'ALL'
          || event.result
            === telemetryResultFilter.value

        return (
          matchesSearch
          && matchesSource
          && matchesResult
        )
      },
    )
  })

const currentPending =
  computed(
    () =>
      activityView.value
        === 'REQUESTS'
        ? pending.value
        : telemetryPending.value,
  )

const currentError =
  computed(
    () =>
      activityView.value
        === 'REQUESTS'
        ? error.value
        : telemetryError.value,
  )

const hasActiveFilters =
  computed(() => {
    if (
      search.value
        .trim()
        .length > 0
    ) {
      return true
    }

    if (
      activityView.value
      === 'REQUESTS'
    ) {
      return (
        statusFilter.value
        !== 'ALL'
      )
    }

    return (
      telemetrySourceFilter.value
        !== 'ALL'
      || telemetryResultFilter.value
        !== 'ALL'
    )
  })

function clearCurrentFilters() {
  search.value =
    ''

  if (
    activityView.value
    === 'REQUESTS'
  ) {
    statusFilter.value =
      'ALL'

    return
  }

  telemetrySourceFilter.value =
    'ALL'

  telemetryResultFilter.value =
    'ALL'
}

async function refreshCurrentView() {
  if (
    activityView.value
    === 'REQUESTS'
  ) {
    await refresh()

    return
  }

  await refreshTelemetry()
}

async function autoRefreshCurrentView() {
  if (
    document.visibilityState
      !== 'visible'
    || currentPending.value
  ) {
    return
  }

  await refreshCurrentView()
}

async function manualRefreshCurrentView() {
  if (manualRefreshing.value) {
    return
  }

  manualRefreshing.value =
    true

  try {
    await refreshCurrentView()
  }
  finally {
    manualRefreshing.value =
      false
  }
}

onMounted(() => {
  observabilityRefreshTimer =
    window.setInterval(
      () => {
        void autoRefreshCurrentView()
      },
      OBSERVABILITY_REFRESH_INTERVAL_MS,
    )
})

onBeforeUnmount(() => {
  if (
    observabilityRefreshTimer
      !== null
  ) {
    window.clearInterval(
      observabilityRefreshTimer,
    )

    observabilityRefreshTimer =
      null
  }
})

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'en-PH',
    {
      dateStyle:
        'medium',

      timeStyle:
        'medium',
    },
  ).format(
    new Date(value),
  )
}

function statusClass(
  statusCode: number,
) {
  if (statusCode >= 500) {
    return [
      'bg-red-100',
      'text-red-800',
    ]
  }

  if (statusCode >= 400) {
    return [
      'bg-amber-100',
      'text-amber-800',
    ]
  }

  return [
    'bg-emerald-100',
    'text-emerald-800',
  ]
}

function methodClass(
  method: string,
) {
  if (method === 'GET') {
    return 'bg-sky-100 text-sky-800'
  }

  if (method === 'POST') {
    return 'bg-violet-100 text-violet-800'
  }

  if (
    method === 'PUT'
    || method === 'PATCH'
  ) {
    return 'bg-amber-100 text-amber-800'
  }

  if (method === 'DELETE') {
    return 'bg-red-100 text-red-800'
  }

  return 'bg-stone-100 text-stone-700'
}
</script>

<template>
  <section
    class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
  >
    <!-- Heading -->
    <div
      class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <NuxtLink
          to="/admin"
          class="text-sm font-medium text-brew-500 hover:text-brew-950"
        >
          ← Admin Dashboard
        </NuxtLink>

        <p
          class="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
        >
          Observability
        </p>

        <h1
          class="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-brew-950"
        >
          System Activity
        </h1>

        <p
          class="mt-4 max-w-3xl leading-7 text-brew-500"
        >
          Review API requests, trace IDs,
          response status, execution time,
          users, branches, and related orders.
        </p>
      </div>

      <button
        type="button"
        class="rounded-xl bg-brew-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brew-800 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="currentPending"
        @click="manualRefreshCurrentView"
      >
        {{
          manualRefreshing
            ? 'Refreshing...'
            : activityView === 'REQUESTS'
              ? 'Refresh Activity'
              : 'Refresh Events'
        }}
      </button>
    </div>

        <!-- Activity view selector -->
    <div
      class="
        mt-8
        inline-flex
        rounded-2xl
        border
        border-brew-200
        bg-white
        p-1
        shadow-sm
      "
    >
      <button
        type="button"
        class="
          rounded-xl
          px-5
          py-2.5
          text-sm
          font-semibold
          transition
        "
        :class="
          activityView === 'REQUESTS'
            ? 'bg-brew-950 text-white'
            : 'text-brew-600 hover:bg-brew-50'
        "
        @click="
          activityView = 'REQUESTS'
        "
      >
        Request Activity
      </button>

      <button
        type="button"
        class="
          rounded-xl
          px-5
          py-2.5
          text-sm
          font-semibold
          transition
        "
        :class="
          activityView === 'EVENTS'
            ? 'bg-brew-950 text-white'
            : 'text-brew-600 hover:bg-brew-50'
        "
        @click="
          activityView = 'EVENTS'
        "
      >
        Telemetry Events
      </button>
    </div>

    <!-- Filters -->
    <div
      class="
        mt-8
        grid
        gap-4
        rounded-2xl
        border
        border-brew-200
        bg-white
        p-5
        shadow-sm
      "
      :class="
        activityView === 'REQUESTS'
          ? 'md:grid-cols-[minmax(0,1fr)_220px]'
          : 'md:grid-cols-[minmax(0,1fr)_220px_220px]'
      "
    >
      <div>
        <label
          for="activity-search"
          class="text-sm font-medium text-brew-950"
        >
          Search
        </label>

        <input
          id="activity-search"
          v-model="search"
          type="search"
          :placeholder="
            activityView === 'REQUESTS'
              ? 'Endpoint, trace ID, request ID, user or order...'
              : 'Event, trace ID, request ID, user, order, source or result...'
          "
          class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 text-sm text-brew-950 outline-none transition focus:border-brew-500"
        >
      </div>

      <div
        v-if="activityView === 'REQUESTS'"
      >
        <label
          for="status-filter"
          class="text-sm font-medium text-brew-950"
        >
          Status
        </label>

        <select
          id="status-filter"
          v-model="statusFilter"
          class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 text-sm text-brew-950 outline-none transition focus:border-brew-500"
        >
          <option value="ALL">
            All requests
          </option>

          <option value="SUCCESS">
            Successful
          </option>

          <option value="CLIENT_ERROR">
            Client errors
          </option>

          <option value="SERVER_ERROR">
            Server errors
          </option>
        </select>
      </div>
      <div
        v-if="activityView === 'EVENTS'"
      >
        <label
          for="telemetry-source-filter"
          class="text-sm font-medium text-brew-950"
        >
          Source
        </label>

        <select
          id="telemetry-source-filter"
          v-model="telemetrySourceFilter"
          class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 text-sm text-brew-950 outline-none transition focus:border-brew-500"
        >
          <option value="ALL">
            All sources
          </option>

          <option
            v-for="source in telemetrySources"
            :key="source"
            :value="source"
          >
            {{ source }}
          </option>
        </select>
      </div>

      <div
        v-if="activityView === 'EVENTS'"
      >
        <label
          for="telemetry-result-filter"
          class="text-sm font-medium text-brew-950"
        >
          Result
        </label>

        <select
          id="telemetry-result-filter"
          v-model="telemetryResultFilter"
          class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 text-sm text-brew-950 outline-none transition focus:border-brew-500"
        >
          <option value="ALL">
            All results
          </option>

          <option
            v-for="result in telemetryResults"
            :key="result"
            :value="result"
          >
            {{ result }}
          </option>
        </select>
      </div>
    </div>

        <div
      v-if="hasActiveFilters"
      class="
        mt-3
        flex
        justify-end
      "
    >
      <button
        type="button"
        class="
          rounded-xl
          border
          border-brew-200
          bg-white
          px-4
          py-2
          text-sm
          font-semibold
          text-brew-700
          transition
          hover:bg-brew-50
        "
        @click="clearCurrentFilters"
      >
        Clear Filters
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="
        currentPending
        && (
          activityView === 'REQUESTS'
            ? requestLogs.length === 0
            : telemetryEvents.length === 0
        )
      "
      class="mt-8 rounded-2xl border border-brew-200 bg-white p-4 sm:p-8 text-sm text-brew-500"
    >
      {{
        activityView === 'REQUESTS'
          ? 'Loading request activity...'
          : 'Loading telemetry events...'
      }}
    </div>

    <!-- Error -->
    <div
      v-else-if="currentError"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6"
    >
      <p
        class="font-semibold text-red-900"
      >
        {{
          activityView === 'REQUESTS'
            ? 'Unable to load request activity.'
            : 'Unable to load telemetry events.'
        }}
      </p>

      <p
        class="mt-2 text-sm text-red-700"
      >
        {{ currentError.message }}
      </p>
    </div>

    <!-- Activity table -->
    <div
      v-else-if="activityView === 'REQUESTS'"
      class="mt-8 overflow-hidden rounded-2xl border border-brew-200 bg-white shadow-sm"
    >
      <div
        class="flex items-center justify-between border-b border-brew-200 px-5 py-4"
      >
        <div>
          <h2
            class="font-semibold text-brew-950"
          >
            Request Activity
          </h2>

          <p
            class="mt-1 text-sm text-brew-500"
          >
            {{ filteredLogs.length }}
            request{{ filteredLogs.length === 1 ? '' : 's' }}
            shown
          </p>
        </div>
      </div>

      <div
        v-if="filteredLogs.length === 0"
        class="p-4 sm:p-8 text-center text-sm text-brew-500"
      >
        {{
          requestLogs.length === 0
            ? 'No request activity has been recorded yet.'
            : 'No request logs match the current search or status filter.'
        }}
      </div>

      <div
        v-else
        class="overflow-x-auto"
       tabindex="0" role="region" aria-label="Observability events, scroll horizontally for more columns">
        <table
          class="min-w-full divide-y divide-brew-200 text-left text-sm"
        >
          <thead
            class="bg-brew-50"
          >
            <tr>
              <th
                class="whitespace-nowrap px-4 py-3 font-semibold text-brew-950"
              >
                Completed
              </th>

              <th
                class="px-4 py-3 font-semibold text-brew-950"
              >
                Request
              </th>

              <th
                class="whitespace-nowrap px-4 py-3 font-semibold text-brew-950"
              >
                Context
              </th>

              <th
                class="whitespace-nowrap px-4 py-3 font-semibold text-brew-950"
              >
                Status
              </th>

              <th
                class="whitespace-nowrap px-4 py-3 font-semibold text-brew-950"
              >
                Duration
              </th>

              <th
                class="min-w-72 px-4 py-3 font-semibold text-brew-950"
              >
                Trace
              </th>
            </tr>
          </thead>

          <tbody
            class="divide-y divide-brew-100"
          >
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="align-top"
            >
              <td
                class="whitespace-nowrap px-4 py-4 text-brew-500"
              >
                {{ formatDateTime(log.completedAt) }}
              </td>

              <td
                class="px-4 py-4"
              >
                <div
                  class="flex items-start gap-2"
                >
                  <span
                    class="rounded-lg px-2 py-1 text-xs font-semibold"
                    :class="methodClass(log.method)"
                  >
                    {{ log.method }}
                  </span>

                  <code
                    class="break-all text-xs text-brew-950"
                  >
                    {{ log.path }}
                  </code>
                </div>
              </td>

              <td
                class="whitespace-nowrap px-4 py-4 text-xs leading-6 text-brew-500"
              >
                <div>
                  User:
                  <span
                    class="font-medium text-brew-950"
                  >
                    {{ log.userId ?? '—' }}
                  </span>
                </div>

                <div>
                  Branch:
                  <span
                    class="font-medium text-brew-950"
                  >
                    {{ log.branchId ?? '—' }}
                  </span>
                </div>

                <div>
                  Order:
                  <span
                    class="font-medium text-brew-950"
                  >
                    {{ log.orderId ?? '—' }}
                  </span>
                </div>
              </td>

              <td
                class="whitespace-nowrap px-4 py-4"
              >
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="statusClass(log.statusCode)"
                >
                  {{ log.statusCode }}
                </span>
              </td>

              <td
                class="whitespace-nowrap px-4 py-4 text-brew-500"
              >
                {{ log.durationMs }} ms
              </td>

              <td
                class="px-4 py-4"
              >
                <div>
                  <p
                    class="text-xs font-semibold uppercase tracking-wide text-brew-500"
                  >
                    Trace ID
                  </p>

                  <code
                    class="mt-1 block break-all text-xs text-brew-950"
                  >
                    {{ log.traceId }}
                  </code>
                </div>

                <div
                  class="mt-3"
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-wide text-brew-500"
                  >
                    Request ID
                  </p>

                  <code
                    class="mt-1 block break-all text-xs text-brew-950"
                  >
                    {{ log.requestId }}
                  </code>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
        <!-- Telemetry events table -->
    <div
      v-else
      class="
        mt-8
        overflow-hidden
        rounded-2xl
        border
        border-brew-200
        bg-white
        shadow-sm
      "
    >
      <div
        class="
          flex
          items-center
          justify-between
          border-b
          border-brew-200
          px-5
          py-4
        "
      >
        <div>
          <h2
            class="
              font-semibold
              text-brew-950
            "
          >
            Telemetry Events
          </h2>

          <p
            class="
              mt-1
              text-sm
              text-brew-500
            "
          >
            {{
              filteredTelemetryEvents.length
            }}
            event{{
              filteredTelemetryEvents.length
                === 1
                ? ''
                : 's'
            }}
            shown
          </p>
        </div>
      </div>

      <div
        v-if="
          filteredTelemetryEvents.length
          === 0
        "
        class="
          p-4
          text-center
          text-sm
          text-brew-500
          sm:p-8
        "
      >
        {{
          telemetryEvents.length === 0
            ? 'No telemetry events have been recorded yet.'
            : 'No telemetry events match the current search, source, or result filters.'
        }}
      </div>

      <div
        v-else
        class="overflow-x-auto"
        tabindex="0"
        role="region"
        aria-label="
          Telemetry events,
          scroll horizontally
          for more columns
        "
      >
        <table
          class="
            min-w-full
            divide-y
            divide-brew-200
            text-left
            text-sm
          "
        >
          <thead
            class="bg-brew-50"
          >
            <tr>
              <th
                class="
                  whitespace-nowrap
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Created
              </th>

              <th
                class="
                  min-w-56
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Event
              </th>

              <th
                class="
                  whitespace-nowrap
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Context
              </th>

              <th
                class="
                  whitespace-nowrap
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Source / Result
              </th>

              <th
                class="
                  min-w-72
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Trace
              </th>

              <th
                class="
                  min-w-72
                  px-4
                  py-3
                  font-semibold
                  text-brew-950
                "
              >
                Metadata
              </th>
            </tr>
          </thead>

          <tbody
            class="
              divide-y
              divide-brew-100
            "
          >
            <tr
              v-for="
                telemetryEvent
                in filteredTelemetryEvents
              "
              :key="telemetryEvent.id"
              class="align-top"
            >
              <td
                class="
                  whitespace-nowrap
                  px-4
                  py-4
                  text-brew-500
                "
              >
                {{
                  formatDateTime(
                    telemetryEvent.createdAt,
                  )
                }}
              </td>

              <td
                class="
                  px-4
                  py-4
                "
              >
                <code
                  class="
                    break-all
                    text-xs
                    font-semibold
                    text-brew-950
                  "
                >
                  {{
                    telemetryEvent.eventName
                  }}
                </code>
              </td>

              <td
                class="
                  whitespace-nowrap
                  px-4
                  py-4
                  text-xs
                  leading-6
                  text-brew-500
                "
              >
                <div>
                  User:
                  <span
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.userId
                      ?? '—'
                    }}
                  </span>
                </div>

                <div>
                  Branch:
                  <span
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.branchId
                      ?? '—'
                    }}
                  </span>
                </div>

                <div>
                  Order:
                  <span
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.orderId
                      ?? '—'
                    }}
                  </span>
                </div>
              </td>

              <td
                class="
                  whitespace-nowrap
                  px-4
                  py-4
                  text-xs
                  leading-6
                "
              >
                <div>
                  <span
                    class="text-brew-500"
                  >
                    Source:
                  </span>

                  <span
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.source
                      ?? '—'
                    }}
                  </span>
                </div>

                <div>
                  <span
                    class="text-brew-500"
                  >
                    Result:
                  </span>

                  <span
                    class="
                      font-medium
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.result
                      ?? '—'
                    }}
                  </span>
                </div>
              </td>

              <td
                class="
                  px-4
                  py-4
                "
              >
                <div>
                  <p
                    class="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-brew-500
                    "
                  >
                    Trace ID
                  </p>

                  <code
                    class="
                      mt-1
                      block
                      break-all
                      text-xs
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.traceId
                      ?? '—'
                    }}
                  </code>
                </div>

                <div
                  class="mt-3"
                >
                  <p
                    class="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-brew-500
                    "
                  >
                    Request ID
                  </p>

                  <code
                    class="
                      mt-1
                      block
                      break-all
                      text-xs
                      text-brew-950
                    "
                  >
                    {{
                      telemetryEvent.requestId
                      ?? '—'
                    }}
                  </code>
                </div>
              </td>

              <td
                class="
                  px-4
                  py-4
                "
              >
                <pre
                  class="
                    max-h-40
                    overflow-auto
                    whitespace-pre-wrap
                    wrap-break-word
                    rounded-xl
                    bg-brew-50
                    p-3
                    text-xs
                    leading-5
                    text-brew-800
                  "
                >{{
                  JSON.stringify(
                    telemetryEvent.metadata,
                    null,
                    2,
                  )
                }}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>