import {
  and,
  desc,
  eq,
  gt,
  isNull,
  lte,
  or,
} from 'drizzle-orm'

import {
  staffDuties,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

interface FindActiveCashierDutyInput {
  branchId: number
  userId: number
}

interface FindActiveManagerDutyInput {
  branchId: number
  userId: number
}

export async function findActiveCashierDuty(
  input: FindActiveCashierDutyInput,
) {
  const db =
    useDb()

  const now =
    new Date().toISOString()

  const rows =
    await db
      .select({
        id:
          staffDuties.id,

        branchId:
          staffDuties.branchId,

        userId:
          staffDuties.userId,

        roleCode:
          staffDuties.roleCode,

        managerUserId:
          staffDuties.managerUserId,

        startedAt:
          staffDuties.startedAt,

        endedAt:
          staffDuties.endedAt,

        isActive:
          staffDuties.isActive,
      })
      .from(
        staffDuties,
      )
      .where(
        and(
          eq(
            staffDuties.branchId,
            input.branchId,
          ),

          eq(
            staffDuties.userId,
            input.userId,
          ),

          eq(
            staffDuties.roleCode,
            'CASHIER',
          ),

          eq(
            staffDuties.isActive,
            true,
          ),

          lte(
            staffDuties.startedAt,
            now,
          ),

          or(
            isNull(
              staffDuties.endedAt,
            ),

            gt(
              staffDuties.endedAt,
              now,
            ),
          ),
        ),
      )
      .orderBy(
        desc(
          staffDuties.startedAt,
        ),
      )
      .limit(1)

  return rows[0] ?? null
}

export async function findActiveManagerDuty(
  input: FindActiveManagerDutyInput,
) {
  const db =
    useDb()

  const now =
    new Date().toISOString()

  const rows =
    await db
      .select({
        id:
          staffDuties.id,

        branchId:
          staffDuties.branchId,

        userId:
          staffDuties.userId,

        roleCode:
          staffDuties.roleCode,

        managerUserId:
          staffDuties.managerUserId,

        startedAt:
          staffDuties.startedAt,

        endedAt:
          staffDuties.endedAt,

        isActive:
          staffDuties.isActive,
      })
      .from(
        staffDuties,
      )
      .where(
        and(
          eq(
            staffDuties.branchId,
            input.branchId,
          ),

          eq(
            staffDuties.userId,
            input.userId,
          ),

          eq(
            staffDuties.roleCode,
            'MANAGER',
          ),

          eq(
            staffDuties.isActive,
            true,
          ),

          lte(
            staffDuties.startedAt,
            now,
          ),

          or(
            isNull(
              staffDuties.endedAt,
            ),

            gt(
              staffDuties.endedAt,
              now,
            ),
          ),
        ),
      )
      .orderBy(
        desc(
          staffDuties.startedAt,
        ),
      )
      .limit(1)

  return rows[0] ?? null
}