import { z } from 'zod'

import {
  findPaymentByProviderReference,
  insertPaymentRecord,
  findPaymentsByOrderId,
} from './repository'

import { 
  logInfo
} from '#server/utils/logger'

export async function getPaymentsByOrder(
  orderId: number,
) {
  if (
    !Number.isInteger(orderId)
    || orderId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid order ID',
    })
  }

  const rows =
    await findPaymentsByOrderId(
      orderId,
    )

  return rows.map(
    payment => ({
      ...payment,

      amount:
        Number(
          payment.amount,
        ),
    }),
  )
}

export const recordPaymentResultSchema =
  z.object({
    orderId: z
      .number()
      .int()
      .positive(),

    method: z
      .string()
      .trim()
      .min(
        1,
        'Payment method is required.',
      )
      .max(40),

    provider: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .nullable()
      .optional(),

    providerReference: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .nullable()
      .optional(),

    amount: z
      .number()
      .positive()
      .refine(
        value =>
          Number.isInteger(
            value * 100,
          ),
        {
          message:
            'Payment amount may have at most two decimal places.',
        },
      ),

    status: z.enum([
      'PENDING',
      'SUCCEEDED',
      'FAILED',
      'UNKNOWN',
    ]),

    failureCode: z
      .string()
      .trim()
      .max(80)
      .nullable()
      .optional(),

    failureMessage: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .refine(
    input => {
      const hasProvider =
        Boolean(
          input.provider,
        )

      const hasReference =
        Boolean(
          input.providerReference,
        )

      /*
       * Provider and provider reference
       * should either both exist or both
       * be absent.
       */
      return (
        hasProvider
        === hasReference
      )
    },
    {
      message:
        'Payment provider and provider reference must be supplied together.',
      path: [
        'providerReference',
      ],
    },
  )

export type RecordPaymentResultInput =
  z.infer<
    typeof recordPaymentResultSchema
  >

export async function recordPaymentResult(
  input: RecordPaymentResultInput,
) {
  const parsed =
    recordPaymentResultSchema.safeParse(
      input,
    )

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid payment data',
      data:
        parsed.error.flatten(),
    })
  }

  const data =
    parsed.data

  const provider =
    data.provider ?? null

  const providerReference =
    data.providerReference ?? null

  /*
   * Idempotency check.
   *
   * If a payment provider sends the
   * same confirmed transaction twice,
   * do not insert a second payment.
   */
  if (
    provider
    && providerReference
  ) {
    const existingPayment =
      await findPaymentByProviderReference(
        provider,
        providerReference,
      )

    if (existingPayment) {
      /*
       * The same provider reference must
       * refer to the same logical payment.
       */
      if (
        existingPayment.orderId
          !== data.orderId
        || Number(
          existingPayment.amount,
        ) !== data.amount
        || existingPayment.transactionType
          !== 'PAYMENT'
      ) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'Payment reference is already in use',
        })
      }

      logInfo(
        'payment.duplicate_prevented',
        {
          orderId:
            data.orderId,
        
          provider,
        
          paymentStatus:
            existingPayment.status,
        
          existingPaymentId:
            existingPayment.id,
        
          duplicatePrevented:
            true,
        
          detection:
            'existing_reference',
        },
      )

      return normalizePayment(
        existingPayment,
      )
    }
  }

  try {
    const payment =
      await insertPaymentRecord({
        orderId:
          data.orderId,

        transactionType:
          'PAYMENT',

        parentPaymentId:
          null,

        method:
          data.method,

        provider,

        providerReference,

        amount:
          data.amount.toFixed(2),

        status:
          data.status,

        failureCode:
          data.failureCode
          ?? null,

        failureMessage:
          data.failureMessage
          ?? null,

        processedAt:
          data.status === 'PENDING'
            ? null
            : new Date()
                .toISOString(),
      })

    return normalizePayment(
      payment,
    )
  }
  catch (error) {
    /*
     * A concurrent duplicate request
     * may have passed the first lookup
     * before another request inserted
     * the same provider reference.
     *
     * Re-read it and treat an identical
     * payment as idempotent.
     */
    if (
      provider
      && providerReference
    ) {
      const existingPayment =
        await findPaymentByProviderReference(
          provider,
          providerReference,
        )

      if (
        existingPayment
        && existingPayment.orderId
          === data.orderId
        && Number(
          existingPayment.amount,
        ) === data.amount
        && existingPayment.transactionType
          === 'PAYMENT'
      ) {

        logInfo(
          'payment.duplicate_prevented',
          {
            orderId:
              data.orderId,
          
            provider,
          
            paymentStatus:
              existingPayment.status,
          
            existingPaymentId:
              existingPayment.id,
          
            duplicatePrevented:
              true,
          
            detection:
              'concurrent_insert_race',
          },
        )
        return normalizePayment(
          existingPayment,
        )
      }
    }

    throw error
  }
}

export async function refundOrderPayment(
  orderId: number,
) {
  if (
    !Number.isInteger(orderId)
    || orderId <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid order ID',
    })
  }

  const paymentRows =
    await findPaymentsByOrderId(
      orderId,
    )

  const successfulPayments =
    paymentRows.filter(
      payment =>
        payment.transactionType
          === 'PAYMENT'
        && payment.status
          === 'SUCCEEDED',
    )

  if (
    successfulPayments.length === 0
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order has no successful payment to refund',
    })
  }

  /*
   * BrewHub MVP currently expects
   * one successful payment per order.
   *
   * Multiple successful payments
   * require a more advanced refund
   * allocation workflow.
   */
  if (
    successfulPayments.length > 1
  ) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Order has multiple successful payments and requires manual review',
    })
  }

  const originalPayment =
    successfulPayments[0]

    if (!originalPayment) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Order has no successful payment to refund'
      })
    }

  /*
   * A successful full refund already
   * linked to this payment makes the
   * operation safely repeatable.
   */
  const existingRefund =
    paymentRows.find(
      payment =>
        payment.transactionType
          === 'REFUND'
        && payment.parentPaymentId
          === originalPayment.id
        && payment.status
          === 'SUCCEEDED',
    )

  if (existingRefund) {
    return normalizePayment(
      existingRefund,
    )
  }

  const amount =
    Number(
      originalPayment.amount,
    )

  if (
    !Number.isFinite(amount)
    || amount <= 0
  ) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Original payment has an invalid amount',
    })
  }

  /*
   * Stable refund reference gives the
   * full-refund operation another
   * idempotency boundary.
   */
  const provider =
    'BREWHUB_REFUND'

  const providerReference =
    `FULL-REFUND-PAYMENT-${originalPayment.id}`

  const existingByReference =
    await findPaymentByProviderReference(
      provider,
      providerReference,
    )

  if (existingByReference) {
    if (
      existingByReference.orderId
        !== orderId
      || existingByReference
        .transactionType
        !== 'REFUND'
      || existingByReference
        .parentPaymentId
        !== originalPayment.id
      || Number(
        existingByReference.amount,
      ) !== amount
      || existingByReference.status
        !== 'SUCCEEDED'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Refund reference is already in use',
      })
    }

    return normalizePayment(
      existingByReference,
    )
  }

  try {
    const refund =
      await insertPaymentRecord({
        orderId,

        transactionType:
          'REFUND',

        parentPaymentId:
          originalPayment.id,

        method:
          originalPayment.method,

        provider,

        providerReference,

        amount:
          amount.toFixed(2),

        status:
          'SUCCEEDED',

        failureCode:
          null,

        failureMessage:
          null,

        processedAt:
          new Date()
            .toISOString(),
      })

    return normalizePayment(
      refund,
    )
  }
  catch (error) {
    /*
     * Handle two concurrent refund
     * requests safely.
     */
    const concurrentRefund =
      await findPaymentByProviderReference(
        provider,
        providerReference,
      )

    if (
      concurrentRefund
      && concurrentRefund.orderId
        === orderId
      && concurrentRefund
        .transactionType
        === 'REFUND'
      && concurrentRefund
        .parentPaymentId
        === originalPayment.id
      && Number(
        concurrentRefund.amount,
      ) === amount
      && concurrentRefund.status
        === 'SUCCEEDED'
    ) {
      return normalizePayment(
        concurrentRefund,
      )
    }

    throw error
  }
}

function normalizePayment<
  T extends {
    amount:
      string | number
  },
>(
  payment: T,
) {
  return {
    ...payment,

    amount:
      Number(
        payment.amount,
      ),
  }
}

