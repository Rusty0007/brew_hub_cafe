import {
  getActiveCustomerByUserId,
} from '#server/domains/customer/service'

import {
  getPaymentsByOrder,
  recordPaymentResult,
} from '#server/domains/payment/service'

import {
  recordCheckoutStage,
  recordCheckoutWorkflowPerformance,
  recordTelemetryEvent,
} from '#server/domains/observability/service'

import {
  startPerformanceTimer,
} from '#server/domains/observability/performance'

import {
  completeOrder,
  findOrderById,
} from './repository'

import {
  logInfo,
  logWarn,
} from '#server/utils/logger'

export interface CompleteCustomerCheckoutInput {
  method: string
  provider: string
  providerReference: string
  status: 'SUCCEEDED'
}

export interface CompletePosCheckoutInput {
  method: string
  provider: string
  providerReference: string

  simulateFailure?: boolean
}

export async function simulatePosPaymentTimeout(
  userId: number,
  orderId: number,
  traceId: string,
) {
  const order =
    await findOrderById(
      orderId,
    )

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'POS order not found',
    })
  }

  if (order.source !== 'POS') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order is not a POS order',
    })
  }

  /*
   * Inventory must already have been
   * reserved before payment is attempted.
   */
  if (
    order.status !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order is not ready for payment',
    })
  }

  const totalAmount =
    Number(
      order.totalAmount ?? 0,
    )

  if (
    !Number.isFinite(totalAmount)
    || totalAmount <= 0
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order total is invalid',
    })
  }

  /*
   * A timeout does NOT mean that the
   * payment definitely failed.
   *
   * Record UNKNOWN so another charge
   * is not attempted blindly.
   */
  const payment =
    await recordPaymentResult({
      orderId:
        order.id,

      processedByUserId:
        null,

      method:
        'SIMULATED_PROVIDER',

      provider:
        'TESDA_SIMULATED_GATEWAY',

      /*
       * Stable reference makes repeated
       * timeout simulation idempotent.
       */
      providerReference:
        `TESDA-TIMEOUT-ORDER-${order.id}`,

      amount:
        totalAmount,

      status:
        'UNKNOWN',

      failureCode:
        'PAYMENT_TIMEOUT',

      failureMessage:
        'Payment provider response timed out; final payment status is unknown.',
    })

  /*
   * Structured operational telemetry.
   */
  logWarn(
    'payment.timeout',
    {
      traceId,

      userId,

      branchId:
        order.branchId,

      orderId:
        order.id,

      paymentStatus:
        'UNKNOWN',

      provider:
        'TESDA_SIMULATED_GATEWAY',

      message:
        'Payment is being verified.',
    },
  )

  await recordTelemetryEvent({
    eventName:
      'payment.timeout',

    traceId,

    userId,

    branchId:
      order.branchId,

    orderId:
      order.id,

    source:
      'POS',

    result:
      'timeout',

    metadata: {
      paymentId:
        payment.id,

      paymentStatus:
        'UNKNOWN',

      provider:
        'TESDA_SIMULATED_GATEWAY',

      failureCode:
        'PAYMENT_TIMEOUT',
    },
  })

  /*
   * Important:
   *
   * Do NOT call completeOrder().
   * Do NOT consume the reservation.
   * Do NOT deduct on-hand inventory.
   *
   * The order remains PENDING_PAYMENT
   * while payment outcome is verified.
   */
  return {
    order,
    payment,

    traceId,

    paymentState:
      'VERIFYING' as const,
  }
}

export async function simulateCustomerPaymentTimeout(
  userId: number,
  orderId: number,
  traceId: string,
) {
  /*
   * Confirm that the logged-in user
   * is an active customer.
   */
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  /*
   * Load the order and verify
   * customer ownership.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (
    !order
    || order.customerId !== customer.id
  ) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  /*
   * Inventory must already have been
   * reserved before payment is attempted.
   */
  if (
    order.status !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order is not ready for payment',
    })
  }

  const totalAmount =
    Number(
      order.totalAmount ?? 0,
    )

  if (
    !Number.isFinite(totalAmount)
    || totalAmount <= 0
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order total is invalid',
    })
  }

  /*
   * A timeout does NOT prove that
   * payment failed.
   *
   * Record UNKNOWN so another charge
   * is not attempted blindly.
   */
  const payment =
    await recordPaymentResult({
      orderId:
        order.id,

      processedByUserId:
        null,

      method:
        'TEST',

      provider:
        'BREWHUB_TEST',

      /*
       * Stable provider reference keeps
       * repeated timeout simulation
       * idempotent.
       */
      providerReference:
        `TEST-TIMEOUT-ORDER-${order.id}`,

      amount:
        totalAmount,

      status:
        'UNKNOWN',

      failureCode:
        'PAYMENT_TIMEOUT',

      failureMessage:
        'Payment provider response timed out; final payment status is unknown.',
    })

  /*
   * Structured payment-timeout log.
   */
  logWarn(
    'payment.timeout',
    {
      traceId,

      userId,

      branchId:
        order.branchId,

      orderId:
        order.id,

      paymentStatus:
        'UNKNOWN',

      provider:
        'BREWHUB_TEST',

      message:
        'Payment is being verified.',
    },
  )

  await recordTelemetryEvent({
    eventName:
      'payment.timeout',

    traceId,

    userId,

    branchId:
      order.branchId,

    orderId:
      order.id,

    source:
      'CUSTOMER',

    result:
      'timeout',

    metadata: {
      paymentId:
        payment.id,

      paymentStatus:
        'UNKNOWN',

      provider:
        'BREWHUB_TEST',

      failureCode:
        'PAYMENT_TIMEOUT',
    },
  })

  /*
   * IMPORTANT:
   *
   * Do NOT call completeOrder().
   * Do NOT consume the reservation.
   * Do NOT deduct inventory.
   *
   * The order remains
   * PENDING_PAYMENT while the
   * payment result is verified.
   */
  return {
    order,
    payment,

    traceId,

    paymentState:
      'VERIFYING' as const,
  }
}

export async function completeCustomerCheckout(
  userId: number,
  orderId: number,
  input: CompleteCustomerCheckoutInput,
  traceId: string,
) {
  /*
   * 1. Confirm that the logged-in user
   * is an active customer.
   */
  const customer =
    await getActiveCustomerByUserId(
      userId,
    )

  /*
   * 2. Load the order and verify
   * ownership.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (
    !order
    || order.customerId !== customer.id
  ) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Order not found',
    })
  }

  /*
   * A completed order is already done.
   */
  if (
    order.status === 'COMPLETED'
  ) {
    return order
  }

  /*
   * Stock must already be reserved
   * before payment is processed.
   */
  if (
    order.status !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order is not ready for payment',
    })
  }

  const totalAmount =
    Number(
      order.totalAmount ?? 0,
    )

  if (
    !Number.isFinite(totalAmount)
    || totalAmount <= 0
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order total is invalid',
    })
  }

  /*
   * 3. Record the successful payment.
   *
   * For now this represents a trusted
   * successful payment result.
   */

  const paymentAuthorizePerformanceTimer =
  startPerformanceTimer()

  const payment =

    await recordPaymentResult({
      orderId:
        order.id,

      processedByUserId:
        null,

      method:
        input.method,

      provider:
        input.provider,

      providerReference:
        input.providerReference,

      amount:
        totalAmount,

      status:
        input.status,

      failureCode:
        null,

      failureMessage:
        null,
    })

    const paymentAuthorizeDurationMs =
      paymentAuthorizePerformanceTimer
      .elapsedMs()

    await recordCheckoutStage({
      stage:
        'payment.authorize',

      durationMs:
        paymentAuthorizeDurationMs,

      traceId,

      userId,

      branchId:
        order.branchId,

      orderId:
        order.id,

      source:
        'CUSTOMER',

      result:
        'success',

      metadata: {
        method:
          input.method,

        provider:
          input.provider,

        paymentId:
          payment.id,
      },
    })

  /*
   * 4. Complete the order.
   *
   * PostgreSQL verifies that SUCCEEDED
   * payments cover the order total before
   * consuming reservations.
   */

  const orderCompletePerformanceTimer =
    startPerformanceTimer()

  await completeOrder(
    order.id,
    userId,
    traceId,
  )

  /*
   * 5. Reload the order after
   * sp_complete_order() finishes.
   */
  const completedOrder =
    await findOrderById(
      order.id,
    )

  if (!completedOrder) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to reload completed order',
    })
  }

  if (
    completedOrder.status
    !== 'COMPLETED'
  ) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Order completion did not finish',
    })
  }

  const orderCompleteDurationMs =
    orderCompletePerformanceTimer
      .elapsedMs()

    await recordCheckoutStage({
    stage:
      'order.complete',

    durationMs:
      orderCompleteDurationMs,

    traceId,

    userId,

    branchId:
      order.branchId,

    orderId:
      order.id,

    source:
      'CUSTOMER',

    result:
      'success',

    metadata: {
      completedStatus:
        completedOrder.status,
    },
  })

  const checkoutOrderType =
  completedOrder.orderType
    === 'DINE_IN'
  || completedOrder.orderType
    === 'TAKEOUT'
    ? completedOrder.orderType
    : null

    await recordCheckoutWorkflowPerformance({
    orderId:
      order.id,

    source:
      'CUSTOMER',

    traceId,

    userId,

    branchId:
      order.branchId,

    orderType:
      checkoutOrderType,
  })

  return {
    order:
      completedOrder,

    payment,

    traceId,
  }
}

export async function completePosCheckout(
  userId: number,
  orderId: number,
  input: CompletePosCheckoutInput,
  traceId: string,
) {
  /*
   * 1. Load the POS order.
   */
  const order =
    await findOrderById(
      orderId,
    )

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'POS order not found',
    })
  }

  /*
   * Only POS orders may use
   * this checkout workflow.
   */
  if (order.source !== 'POS') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order is not a POS order',
    })
  }

  /*
   * Already completed:
   * do not charge or consume stock again.
   */
  if (
    order.status === 'COMPLETED'
  ) {
    return order
  }

  /*
   * Inventory must already be reserved.
   */
  if (
    order.status !== 'PENDING_PAYMENT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order is not ready for payment',
    })
  }

    /*
   * A previous payment attempt may have
   * timed out without a final provider
   * result.
   *
   * Do not accept another payment while
   * that payment remains UNKNOWN.
   */
  const payments =
    await getPaymentsByOrder(
      order.id,
    )

  const hasUnknownPayment =
    payments.some(
      payment =>
        payment.status === 'UNKNOWN',
    )

  if (hasUnknownPayment) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Payment is being verified. Another payment cannot be submitted yet.',
    })
  }

  const totalAmount =
    Number(
      order.totalAmount ?? 0,
    )

  if (
    !Number.isFinite(totalAmount)
    || totalAmount <= 0
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'POS order total is invalid',
    })
  }

  const paymentStartedAtMs =
    Date.now()

    logInfo(
      'payment.authorize',
      {
        traceId,

        userId,

        branchId:
          order.branchId,

        orderId:
          order.id,

        method:
          input.method,

        provider:
          input.provider,

        source:
          'POS',
      },
    )

    let payment:
      Awaited<
        ReturnType<
          typeof recordPaymentResult
        >
      >

    /*
     * 2. Record successful payment.
     */
    try {
      if (
        input.simulateFailure
        && process.env.NODE_ENV
          === 'development'
      ) {
        throw new Error(
          'TESDA simulated payment failure',
        )
      }

      const paymentAuthorizePerformanceTimer =
        startPerformanceTimer()

      payment =
        await recordPaymentResult({
          orderId:
            order.id,

          processedByUserId:
            userId,

          method:
            input.method,

          provider:
            input.provider,

          providerReference:
            input.providerReference,

          amount:
            totalAmount,

          status:
            'SUCCEEDED',

          failureCode:
            null,

          failureMessage:
            null,
        })

      const paymentAuthorizeDurationMs =
        paymentAuthorizePerformanceTimer
          .elapsedMs()

      await recordCheckoutStage({
        stage:
          'payment.authorize',

        durationMs:
          paymentAuthorizeDurationMs,

        traceId,

        userId,

        branchId:
          order.branchId,

        orderId:
          order.id,

        source:
          'POS',

        result:
          'success',

        metadata: {
          method:
            input.method,

          provider:
            input.provider,

          paymentId:
            payment.id,
        },
      })

      logInfo(
        'payment.succeeded',
        {
          traceId,

          userId,

          branchId:
            order.branchId,

          orderId:
            order.id,

          method:
            input.method,

          provider:
            input.provider,

          paymentId:
            payment.id,

          durationMs:
            Date.now()
            - paymentStartedAtMs,

          result:
            'success',

          source:
            'POS',
        },
      )
    }
    catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Payment processing failed'

      logWarn(
        'payment.failed',
        {
          traceId,

          userId,

          branchId:
            order.branchId,

          orderId:
            order.id,

          method:
            input.method,

          provider:
            input.provider,

          durationMs:
            Date.now()
            - paymentStartedAtMs,

          result:
            'failed',

          source:
            'POS',

          message,
        },
      )

      throw error
    }



  /*
   * 3. Complete the order.
   *
   * PostgreSQL verifies payment,
   * consumes reservations,
   * deducts stock, creates SALE
   * movements, and marks COMPLETED.
   */

  const orderCompletePerformanceTimer =
  startPerformanceTimer()

  await completeOrder(
    order.id,
    userId,
    traceId,
  )

  /*
   * 4. Reload completed order.
   */
  const completedOrder =
    await findOrderById(
      order.id,
    )

  if (!completedOrder) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to reload completed POS order',
    })
  }

  if (
    completedOrder.status
    !== 'COMPLETED'
  ) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'POS order completion did not finish',
    })
  }

  const orderCompleteDurationMs =
  orderCompletePerformanceTimer
    .elapsedMs()

  await recordCheckoutStage({
    stage:
      'order.complete',

    durationMs:
      orderCompleteDurationMs,

    traceId,

    userId,

    branchId:
      order.branchId,

    orderId:
      order.id,

    source:
      'POS',

    result:
      'success',

    metadata: {
      completedStatus:
        completedOrder.status,
    },
  })

    const checkoutOrderType =
      completedOrder.orderType
        === 'DINE_IN'
      || completedOrder.orderType
        === 'TAKEOUT'
        ? completedOrder.orderType
        : null

    await recordCheckoutWorkflowPerformance({
    orderId:
      order.id,

    source:
      'POS',

    traceId,

    userId,

    branchId:
      order.branchId,

    orderType:
      checkoutOrderType,
  })

  return {
    order:
      completedOrder,

    payment,

    traceId,
  }
}
