import type { staffRole } from "./types";

export const PERMISSIONS = [
    'catalog.read',
    'catalog.manage',
    'catalog.price.update',

    'orders.create',
    'orders.cancel',

    'inventory.read',
    'inventory.adjust',

    'payments.process',
    'payments.refund',

    'reports.view',

    'users.manage',
] as const

export type Permission =
    typeof PERMISSIONS[number]

export const ROLE_PERMISSIONS: Record<staffRole, readonly Permission[]> = {
    CASHIER: [
        'catalog.read',
        'orders.create',
        'inventory.read',
        'payments.process'
    ],

    MANAGER: [
        'catalog.read',
        'catalog.manage',
        'catalog.price.update',

        'orders.create',
        'orders.cancel',

        'inventory.read',
        'inventory.adjust',

        'payments.process',
        'payments.refund',

        'reports.view'
    ],

    ADMIN: [
        'catalog.read',
        'catalog.manage',
        'catalog.price.update',

        'orders.create',
        'orders.cancel',

        'payments.process',
        'payments.refund',

        'reports.view',

        'users.manage'
    ],
}

export function hasPermission(role: staffRole, permission: Permission) {
    return ROLE_PERMISSIONS[
        role
    ].includes(permission)
}