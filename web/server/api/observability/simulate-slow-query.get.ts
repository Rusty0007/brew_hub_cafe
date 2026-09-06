import {
  sql,
} from 'drizzle-orm'

import {
  requireAnyRole,
} from '#server/domains/authentication/authorization'

import {
  useDb,
} from '#server/utils/db'

export default defineEventHandler(
  async (event) => {
    /*
     * Development-only diagnostic.
     *
     * This intentionally executes a
     * database query slower than the
     * 500 ms critical-query threshold
     * so Task 11 alert behavior can be
     * verified through BrewHub's own
     * instrumented database connection.
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

    await requireAnyRole(
      event,
      [
        'ADMIN',
      ],
    )

    const db =
      useDb()

    const startedAtMs =
      Date.now()

    await db.execute(
      sql`
        SELECT
          pg_sleep(0.6)
      `,
    )

    const durationMs =
      Date.now()
      - startedAtMs

    return {
      message:
        'Slow database query simulation completed.',
      durationMs,
      expectedThresholdMs:
        500,
    }
  },
)