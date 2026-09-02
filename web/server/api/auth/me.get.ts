import { getCurrentUser } from '#server/domains/authentication/session'

export default defineEventHandler(async (event) => {
    const user = await getCurrentUser(event)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required',
        })
    }

    return {
        user,
    }
})