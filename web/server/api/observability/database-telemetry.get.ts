import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getDatabaseTelemetry,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const databaseTelemetry =
      await getDatabaseTelemetry()

    return {
      databaseTelemetry,
    }
  },
)