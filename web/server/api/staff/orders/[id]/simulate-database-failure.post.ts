import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  simulateDatabaseRollback,
} from '#server/domains/ordering/repository'

import {
  getBrewHubRequestContext,
  updateBrewHubRequestContext,
} from '#server/utils/request-context'

import {
  logError,
} from '#server/utils/logger'

export default defineEventHandler(
  async (event) => {
    const staff =
      await requireAnyRole(
        event,
        [
          'CASHIER',
          'MANAGER',
        ],
      )

    /*
     * This failure simulation must never
     * be available in production.
     */
    if (
      process.env.NODE_ENV
      !== 'development'
    ) {
      throw createError({
        statusCode: 404,
        statusMessage:
          'Not found',
      })
    }

    const orderId =
      Number(
        getRouterParam(
          event,
          'id',
        ),
      )

    if (
      !Number.isInteger(orderId)
      || orderId <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid order ID',
      })
    }

    updateBrewHubRequestContext(
      event,
      {
        orderId,
      },
    )

    const requestContext =
      getBrewHubRequestContext(
        event,
      )

    const rollbackResult =
      await simulateDatabaseRollback(
        orderId,
      )

    /*
     * TESDA failure telemetry.
     *
     * The database operation failed,
     * PostgreSQL rolled the transaction
     * back, and the application reports
     * the failure without exposing
     * sensitive database details.
     */
    logError(
      'database.error',
      {
        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        userId:
          staff.id,

        orderId,

        rolledBack:
          rollbackResult.rolledBack,

        beforeVersion:
          rollbackResult.beforeVersion,

        afterVersion:
          rollbackResult.afterVersion,

        message:
          'Simulated database transaction failed and was rolled back.',
      },
    )

    /*
     * User-facing response required by
     * the TESDA failure scenario.
     */
    throw createError({
      statusCode: 503,

      statusMessage:
        'Unable to process',

      data: {
        rolledBack:
          rollbackResult.rolledBack,

        beforeVersion:
          rollbackResult.beforeVersion,

        afterVersion:
          rollbackResult.afterVersion,

        beforeStatus:
          rollbackResult.beforeStatus,

        afterStatus:
          rollbackResult.afterStatus,

        traceId:
          requestContext.traceId,
      },
    })
  },
)