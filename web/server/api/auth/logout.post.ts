import { clearAuthSession } from '#server/domains/authentication/session'

export default defineEventHandler(async (event) => {
    await clearAuthSession(event)

    return {
        message: 'Logout successful',
    }
})