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

const search =
  ref('')

const statusFilter =
  ref<
    | 'ALL'
    | 'SUCCESS'
    | 'CLIENT_ERROR'
    | 'SERVER_ERROR'
  >('ALL')

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
          class="mt-3 text-4xl font-semibold tracking-tight text-brew-950"
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
        :disabled="pending"
        @click="refresh()"
      >
        {{ pending ? 'Refreshing...' : 'Refresh Activity' }}
      </button>
    </div>

    <!-- Filters -->
    <div
      class="mt-8 grid gap-4 rounded-2xl border border-brew-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px]"
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
          placeholder="Endpoint, trace ID, request ID, user or order..."
          class="mt-2 w-full rounded-xl border border-brew-200 bg-white px-4 py-3 text-sm text-brew-950 outline-none transition focus:border-brew-500"
        >
      </div>

      <div>
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
    </div>

    <!-- Loading -->
    <div
      v-if="pending && !data"
      class="mt-8 rounded-2xl border border-brew-200 bg-white p-8 text-sm text-brew-500"
    >
      Loading system activity...
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6"
    >
      <p
        class="font-semibold text-red-900"
      >
        Unable to load system activity.
      </p>

      <p
        class="mt-2 text-sm text-red-700"
      >
        {{ error.message }}
      </p>
    </div>

    <!-- Activity table -->
    <div
      v-else
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
        class="p-8 text-center text-sm text-brew-500"
      >
        No request logs match the current filters.
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
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
  </section>
</template>