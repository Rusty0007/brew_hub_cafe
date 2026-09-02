import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getRecentRequestLogs,
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
        query.limit ?? 100,
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
            200,
          )
        : 100

    const requestLogs =
      await getRecentRequestLogs(
        limit,
      )

    return {
      requestLogs,
    }
  },
)