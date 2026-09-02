import { sql } from 'drizzle-orm'
import { useDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = useDb()

  const result = await db.execute(sql`
    SELECT
      current_database() AS database,
      current_user AS database_user,
      current_schema() AS current_schema,
      version() AS postgres_version
  `)

  return {
    status: 'ok',
    database: result.rows[0],
  }
})