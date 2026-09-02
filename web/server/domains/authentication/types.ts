export const STAFF_ROLES = [
    'CASHIER',
    'MANAGER',
    'ADMIN'
] as const

export type staffRole =
    typeof STAFF_ROLES[number]

export function isStaffRole(
    value: string,
): value is staffRole {
    return STAFF_ROLES.includes(
        value as staffRole,
    )
}