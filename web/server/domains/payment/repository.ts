import {
  and,
  desc,
  eq,
  sql,
} from 'drizzle-orm'

import {
  alias
} from 'drizzle-orm/pg-core'

import {
  auditLogs,
  payments,
  roles,
  userRoles,
  users,
} from '#server/db/schema'

import {
  useDb,
} from '#server/utils/db'

import type {
  CreatePaymentRecordInput,
} from './types'

const paymentProcessorUser =
  alias(
    users,
    'payment_processor_user',
  )

interface RefundOriginalPaymentAuditData {
  id: number
  amount: string | number
  status: string
}

interface RefundAuditContext {
  actorUserId: number
  branchId: number | null
  reason: string
  traceId?: string | null

  originalPayment:
    RefundOriginalPaymentAuditData
}

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

        processedByUserId:
          payments.processedByUserId,

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

      processedByUserId:
        payments.processedByUserId,

      processedByFirstName:
        paymentProcessorUser.firstName,

      processedByLastName:
        paymentProcessorUser.lastName,

      processedByRole:
        sql<string | null>`
          (
            SELECT ${roles.name}
            FROM ${userRoles}
            INNER JOIN ${roles}
              ON ${roles.id}
                = ${userRoles.roleId}
            WHERE
              ${userRoles.userId}
                = ${payments.processedByUserId}
              AND ${roles.code}
                IN ('CASHIER', 'MANAGER')
            ORDER BY
              CASE ${roles.code}
                WHEN 'MANAGER' THEN 1
                WHEN 'CASHIER' THEN 2
                ELSE 3
              END
            LIMIT 1
          )
        `,

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
    .leftJoin(
      paymentProcessorUser,
      eq(
        paymentProcessorUser.id,
        payments.processedByUserId,
      ),
    )
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

        processedByUserId:
          input.processedByUserId,

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

        processedByUserId:
          payments.processedByUserId,

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

export async function insertRefundPaymentRecordWithAudit(
  input: CreatePaymentRecordInput,
  auditContext: RefundAuditContext,
) {
  const db =
    useDb()

  return await db.transaction(
    async (tx) => {
      const rows =
        await tx
          .insert(payments)
          .values({
            orderId:
              input.orderId,

            transactionType:
              input.transactionType,

            parentPaymentId:
              input.parentPaymentId,

            processedByUserId:
              input.processedByUserId,

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

            processedByUserId:
              payments.processedByUserId,

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

      const refund =
        rows[0]

      if (!refund) {
        throw new Error(
          'Unable to create refund payment record',
        )
      }

      const auditReason =
        auditContext.reason.trim()

      /*
       * A successful refund must never
       * commit without its audit reason.
       *
       * Throwing here rolls back the
       * refund INSERT because both writes
       * are inside the same transaction.
       */
      if (!auditReason) {
        throw new Error(
          'Refund requires an audit reason',
        )
      }

      await tx
        .insert(
          auditLogs,
        )
        .values({
          actorUserId:
            auditContext.actorUserId,

          branchId:
            auditContext.branchId,

          action:
            'payment.refund',

          resourceType:
            'payment',

          resourceId:
            String(
              refund.id,
            ),

          beforeData: {
            orderId:
              input.orderId,

            originalPaymentId:
              auditContext
                .originalPayment.id,

            status:
              auditContext
                .originalPayment.status,

            amount:
              Number(
                auditContext
                  .originalPayment.amount,
              ),
          },

          afterData: {
            orderId:
              refund.orderId,

            refundPaymentId:
              refund.id,

            parentPaymentId:
              refund.parentPaymentId,

            transactionType:
              refund.transactionType,

            status:
              refund.status,

            amount:
              Number(
                refund.amount,
              ),
          },

          reason:
            auditReason,

          traceId:
            auditContext.traceId
            ?? null,
        })

      return refund
    },
  )
}