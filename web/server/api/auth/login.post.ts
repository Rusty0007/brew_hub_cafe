import { z } from 'zod'
import { authenticateUser } from '#server/domains/authentication/service'
import { createAuthSession } from '#server/domains/authentication/session'
import { read } from 'node:fs'
import { parse } from 'node:path'

const bodySchema = z.object({
    username: z
    .string()
    .trim()
    .min(3)
    .max(80),

    password: z
    .string()
    .min(8)
    .max(128)
})

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid login data',
            data: parsed.error.flatten(),
        })
    }

    const user = await authenticateUser(
        parsed.data.username,
        parsed.data.password
    )

    if (!user) {
        throw createError({
            status: 400,
            statusMessage: 'Invalid credentials',
        })
    }

    await createAuthSession(event, user.id)

    return {
        message: 'Login successful', user,
    }
})