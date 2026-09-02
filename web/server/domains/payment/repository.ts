import {
  and,
  desc,
  eq,
} from 'drizzle-orm'

import {
  payments,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

import type {
  CreatePaymentRecordInput,
} from './types'

export async function findPaymentByProviderReference(
  provider: string,
  providerReference: string,
) {
  const db =
    useDb()

  const rows =
    await db
      .select({
        id:
          payments.id,

        orderId:
          payments.orderId,

        transactionType:
          payments.transactionType,

        parentPaymentId:
          payments.parentPaymentId,

        method:
          payments.method,

        provider:
          payments.provider,

        providerReference:
          payments.providerReference,

        amount:
          payments.amount,

        status:
          payments.status,

        failureCode:
          payments.failureCode,

        failureMessage:
          payments.failureMessage,

        createdAt:
          payments.createdAt,

        updatedAt:
          payments.updatedAt,

        processedAt:
          payments.processedAt,
      })
      .from(payments)
      .where(
        and(
          eq(
            payments.provider,
            provider,
          ),

          eq(
            payments.providerReference,
            providerReference,
          ),
        ),
      )
      .limit(1)

  return rows[0] ?? null
}

export async function findPaymentsByOrderId(
  orderId: number,
) {
  const db =
    useDb()

  return db
    .select({
      id:
        payments.id,

      orderId:
        payments.orderId,

      transactionType:
        payments.transactionType,

      parentPaymentId:
        payments.parentPaymentId,

      method:
        payments.method,

      provider:
        payments.provider,

      providerReference:
        payments.providerReference,

      amount:
        payments.amount,

      status:
        payments.status,

      failureCode:
        payments.failureCode,

      failureMessage:
        payments.failureMessage,

      createdAt:
        payments.createdAt,

      updatedAt:
        payments.updatedAt,

      processedAt:
        payments.processedAt,
    })
    .from(payments)
    .where(
      eq(
        payments.orderId,
        orderId,
      ),
    )
    .orderBy(
      desc(
        payments.createdAt,
      ),
    )
}

export async function insertPaymentRecord(
  input: CreatePaymentRecordInput,
) {
  const db =
    useDb()

  const rows =
    await db
      .insert(payments)
      .values({
        orderId:
          input.orderId,

        transactionType:
          input.transactionType,

        parentPaymentId:
          input.parentPaymentId,

        method:
          input.method,

        provider:
          input.provider,

        providerReference:
          input.providerReference,

        amount:
          input.amount,

        status:
          input.status,

        failureCode:
          input.failureCode,

        failureMessage:
          input.failureMessage,

        processedAt:
          input.processedAt,
      })
      .returning({
        id:
          payments.id,

        orderId:
          payments.orderId,

        transactionType:
          payments.transactionType,

        parentPaymentId:
          payments.parentPaymentId,

        method:
          payments.method,

        provider:
          payments.provider,

        providerReference:
          payments.providerReference,

        amount:
          payments.amount,

        status:
          payments.status,

        failureCode:
          payments.failureCode,

        failureMessage:
          payments.failureMessage,

        createdAt:
          payments.createdAt,

        updatedAt:
          payments.updatedAt,

        processedAt:
          payments.processedAt,
      })

  const payment =
    rows[0]

  if (!payment) {
    throw new Error(
      'Unable to create payment record',
    )
  }

  return payment
}