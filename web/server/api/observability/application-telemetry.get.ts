import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getApplicationTelemetry,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const applicationTelemetry =
      await getApplicationTelemetry()

    return {
      applicationTelemetry,
    }
  },
)