import {
  asc,
  sql,
} from 'drizzle-orm'

import {
  branches,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

export default defineEventHandler(
  async () => {
    const db = useDb()

    const connectionInfo =
      await db.execute(
        sql`
          SELECT
            current_database() AS database_name,
            current_user AS database_user,
            current_schema() AS current_schema
        `,
      )

    const rows =
      await db
        .select({
          id: branches.id,
          code: branches.code,
          name: branches.name,
          timezone: branches.timezone,
          isActive: branches.isActive,
        })
        .from(branches)
        .orderBy(
          asc(branches.id),
        )

    return {
      connection:
        connectionInfo.rows[0],

      branches:
        rows,
    }
  },
)