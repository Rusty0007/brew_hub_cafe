import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getPerformanceTelemetry,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const performanceTelemetry =
      await getPerformanceTelemetry()

    return {
      performanceTelemetry,
    }
  },
)