import {
  recoverExpiredPendingOrders,
} from '#server/domains/ordering/repository'

export default defineTask({
  meta: {
    name:
      'ordering:recover-expired-pending-orders',

    description:
      'Recover orders whose payment reservations have expired',
  },

  async run() {
    await recoverExpiredPendingOrders(
      100,
    )

    return {
      result:
        'Expired pending orders recovery completed',
    }
  },
})