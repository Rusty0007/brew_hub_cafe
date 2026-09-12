import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getRecentTelemetryEvents,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const query =
      getQuery(
        event,
      )

    const requestedLimit =
      Number(
        query.limit ?? 200,
      )

    const limit =
      Number.isFinite(
        requestedLimit,
      )
        ? Math.min(
            Math.max(
              Math.trunc(
                requestedLimit,
              ),
              1,
            ),
            500,
          )
        : 200

    const telemetryEvents =
      await getRecentTelemetryEvents(
        limit,
      )

    return {
      telemetryEvents,
    }
  },
)