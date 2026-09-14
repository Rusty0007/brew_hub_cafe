import {
  getExpiredActiveReservationOrderIds,
} from '#server/domains/inventory/service'

import {
  recoverExpiredPendingOrders,
} from '#server/domains/ordering/repository'

import {
  reconcileSimulatedUnknownPaymentsForOrders,
} from '#server/domains/payment/service'

export default defineTask({
  meta: {
    name:
      'ordering:recover-expired-pending-orders',

    description:
      'Reconcile simulated payment timeouts and recover expired pending orders',
  },

  async run() {
    /*
     * Step 1:
     *
     * Ask Inventory which orders still
     * have ACTIVE reservations whose
     * reservation window has expired.
     */
    const expiredOrderIds =
      await getExpiredActiveReservationOrderIds(
        100,
      )

    /*
     * Step 2:
     *
     * Resolve only BrewHub development
     * timeout simulations that are still
     * UNKNOWN.
     *
     * Real payment providers are not
     * automatically failed here.
     */
    const reconciliation =
      await reconcileSimulatedUnknownPaymentsForOrders(
        expiredOrderIds,
      )

    /*
     * Step 3:
     *
     * Run the existing database recovery.
     *
     * Payments reconciled to FAILED no
     * longer block the procedure, allowing
     * expired reservations to be released
     * safely.
     */
    await recoverExpiredPendingOrders(
      100,
    )

    return {
      result:
        'Expired pending orders recovery completed',

      expiredOrdersChecked:
        expiredOrderIds.length,

      reconciledPayments:
        reconciliation.reconciledCount,
    }
  },
})