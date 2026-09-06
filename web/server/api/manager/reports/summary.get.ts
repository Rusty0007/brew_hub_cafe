import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  getManagerReportSummary,
} from '#server/domains/reporting/service'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  recordPerformanceSample,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

export default defineEventHandler(
  async (event) => {
    await requireAnyRole(
      event,
      [
        'MANAGER',
        'ADMIN',
      ],
    )

    const reportPerformanceTimer =
      startPerformanceTimer()

    const report =
      await getManagerReportSummary()

    const reportDurationMs =
      reportPerformanceTimer
      .elapsedMs()

    updateBrewHubRequestContext(
      event,
      {
        branchId:
          report.branch.id,
      },
    )

    const reportContext =
      getBrewHubRequestContext(
      event,
    )

    void recordPerformanceSample({
      operation:
        'report.standard',

      durationMs:
        reportDurationMs,

      requestId:
        reportContext.requestId,

      traceId:
        reportContext.traceId,

      branchId:
        report.branch.id,

      result:
        'success',

      metadata: {
        reportType:
          'manager.summary',
      },
    })

    return {
      report,
    }
  },
)
