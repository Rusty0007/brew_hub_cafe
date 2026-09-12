import {
  findActiveCashierDuty,
  findActiveManagerDuty,
} from './repository'

interface ResolveManagerForCashierInput {
  branchId: number
  cashierUserId: number
}

export async function resolveManagerForCashier(
  input: ResolveManagerForCashierInput,
) {
  /*
   * First confirm that the Cashier
   * currently has an active duty
   * assignment for this branch.
   */
  const cashierDuty =
    await findActiveCashierDuty({
      branchId:
        input.branchId,

      userId:
        input.cashierUserId,
    })

  if (!cashierDuty) {
    return null
  }

  /*
   * A Cashier duty may temporarily
   * exist without a Manager assignment.
   */
  if (
    cashierDuty.managerUserId
    == null
  ) {
    return null
  }

  /*
   * Never trust manager_user_id from
   * the Cashier duty by itself.
   *
   * Verify that the referenced user
   * really has an active MANAGER duty
   * in the same branch and time window.
   */
  const managerDuty =
    await findActiveManagerDuty({
      branchId:
        input.branchId,

      userId:
        cashierDuty.managerUserId,
    })

  if (!managerDuty) {
    return null
  }

  return {
    cashierDutyId:
      cashierDuty.id,

    managerDutyId:
      managerDuty.id,

    managerUserId:
      managerDuty.userId,
  }
}