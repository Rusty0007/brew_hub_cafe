import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getManagerReportSummary,
} from '#server/domains/reporting/service'

import {
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'MANAGER',
        'ADMIN',
      ],
    )

    const report =
      await getManagerReportSummary()

    updateBrewHubRequestContext(
      event,
      {
        branchId:
          report.branch.id,
      },
    )

    return {
      report,
    }
  },
)