import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getAlertTelemetry,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const alertTelemetry =
      await getAlertTelemetry()

    return {
      alertTelemetry,
    }
  },
)