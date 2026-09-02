import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getSecurityTelemetry,
} from '#server/domains/observability/service'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const securityTelemetry =
      await getSecurityTelemetry()

    return {
      securityTelemetry,
    }
  },
)