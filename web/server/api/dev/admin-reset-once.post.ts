import {
  createError,
  defineEventHandler,
  readBody,
} from 'h3'

import {
  sql,
} from 'drizzle-orm'

import {
  useDb,
} from '#server/utils/db'

export default defineEventHandler(
  async (event) => {
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

    const body =
      await readBody<{
        password?: string
      }>(
        event,
      )

    const password =
      body.password?.trim()

    if (
      !password
      || password.length < 8
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Password must contain at least 8 characters',
      })
    }

    const passwordHash =
      await hashPassword(
        password,
      )

    const db =
      useDb()

    const result =
      await db.execute(
        sql`
          UPDATE brewhub.users
          SET
            password_hash =
              ${passwordHash},
            updated_at =
              now()
          WHERE lower(username)
            = lower('admin')
          RETURNING
            id,
            username
        `,
      )

    const user =
      result.rows[0]

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage:
          'Admin user not found',
      })
    }

    return {
      message:
        'Admin password reset successfully',

      user: {
        id:
          Number(
            user.id,
          ),

        username:
          String(
            user.username,
          ),
      },
    }
  },
)