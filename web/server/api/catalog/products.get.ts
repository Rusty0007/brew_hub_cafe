import { z } from 'zod'

import {
  getProducts,
} from '#server/domains/catalog/service'

import {
  recordPerformanceSample,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

import type {
  PerformanceOperation,
} from '#server/domains/observability/performance'

import {
  getBrewHubRequestContext,
} from '#server/utils/request-context'

const querySchema = z.object({
  categoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  search: z
    .string()
    .trim()
    .max(100)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
})

export default defineEventHandler(
  async (event) => {
    /*
     * Read and validate the catalog
     * query before starting the Task 10
     * performance measurement.
     */
    const query =
      getQuery(event)

    const parsed =
      querySchema.safeParse(
        query,
      )

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid catalog query',

        data:
          parsed.error.flatten(),
      })
    }

    const {
      categoryId,
      search,
      limit,
      offset,
    } = parsed.data

    /*
     * The same API serves two separate
     * TESDA performance operations.
     *
     * Empty search:
     *   Product List
     *
     * Non-empty search:
     *   Product Search
     */
    const normalizedSearch =
      search?.trim()
      ?? ''

    const operation:
      PerformanceOperation =
      normalizedSearch.length > 0
        ? 'catalog.product_search'
        : 'catalog.product_list'

    /*
     * Start after request validation
     * and stop when Catalog has returned
     * both page data and total count.
     */
    const performanceTimer =
      startPerformanceTimer()

    try {
      const result =
        await getProducts({
          categoryId,

          search:
            normalizedSearch
              || undefined,

          limit,
          offset,
        })

      /*
       * Stop performance measurement
       * BEFORE persisting telemetry.
       */
      const durationMs =
        performanceTimer.elapsedMs()

      const requestContext =
        getBrewHubRequestContext(
          event,
        )

      await recordPerformanceSample({
        operation,

        durationMs,

        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        userId:
          requestContext.userId,

        branchId:
          requestContext.branchId,

        source:
          'CATALOG',

        result:
          'success',

        metadata: {
          categoryId:
            categoryId
            ?? null,

          limit,

          offset,

          hasSearch:
            normalizedSearch.length
            > 0,

          searchLength:
            normalizedSearch.length,

          resultCount:
            result.data.length,

          totalMatches:
            result.total,
        },
      })

      return {
        data:
          result.data,

        meta: {
          count:
            result.data.length,

          total:
            result.total,

          limit,

          offset,

          categoryId:
            categoryId
            ?? null,

          search:
            normalizedSearch
              || null,
        },
      }
    }
    catch (error) {
      /*
       * Failed Catalog operations are
       * still useful performance samples.
       */
      const durationMs =
        performanceTimer.elapsedMs()

      const requestContext =
        getBrewHubRequestContext(
          event,
        )

      await recordPerformanceSample({
        operation,

        durationMs,

        requestId:
          requestContext.requestId,

        traceId:
          requestContext.traceId,

        userId:
          requestContext.userId,

        branchId:
          requestContext.branchId,

        source:
          'CATALOG',

        result:
          'failed',

        metadata: {
          categoryId:
            categoryId
            ?? null,

          limit,

          offset,

          hasSearch:
            normalizedSearch.length
            > 0,

          searchLength:
            normalizedSearch.length,

          message:
            error instanceof Error
              ? error.message
              : 'Catalog request failed',
        },
      })

      throw error
    }
  },
)