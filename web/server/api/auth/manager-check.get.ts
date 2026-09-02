import {
    requireRole,
} from '#server/domains/authentication/authorization'

export default defineEventHandler(async (event) => {
    const user = await requireRole(
        event,
        'MANAGER',
    )

    return {
        message: 'Manager access granted',
        user,
    }
})