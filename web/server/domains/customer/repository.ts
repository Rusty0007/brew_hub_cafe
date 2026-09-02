import {
  eq,
  sql,
} from 'drizzle-orm'

import {
  customers,
  users,
} from '#server/db/schema'

import { useDb } from '#server/utils/db'

export async function findCustomerByUserId(
  userId: number,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      customerNo: customers.customerNo,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      phone: customers.phone,
      isActive: customers.isActive,
    })
    .from(customers)
    .where(
      eq(customers.userId, userId),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function findCustomerByEmail(
  email: string,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
    })
    .from(customers)
    .where(
      sql`
        lower(${customers.email})
        = lower(${email})
      `,
    )
    .limit(1)

  return rows[0] ?? null
}

interface CreateCustomerAccountInput {
  username: string
  passwordHash: string
  displayName: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
}

export async function insertCustomerAccount(
  input: CreateCustomerAccountInput,
) {
  const db = useDb()

  return db.transaction(
    async (tx) => {
      const insertedUsers =
        await tx
          .insert(users)
          .values({
            username: input.username,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
            email: input.email,
            isActive: true,
          })
          .returning({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            email: users.email,
          })

      const user = insertedUsers[0]

      if (!user) {
        throw new Error(
          'Unable to create user account',
        )
      }

      const insertedCustomers =
        await tx
          .insert(customers)
          .values({
            userId: user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            isActive: true,
          })
          .returning({
            id: customers.id,
            userId: customers.userId,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            isActive: customers.isActive,
          })

      const customer =
        insertedCustomers[0]

      if (!customer) {
        throw new Error(
          'Unable to create customer profile',
        )
      }

      const customerNo =
        `CUS-${String(customer.id)
          .padStart(6, '0')}`

      const updatedCustomers =
        await tx
          .update(customers)
          .set({
            customerNo,
          })
          .where(
            eq(
              customers.id,
              customer.id,
            ),
          )
          .returning({
            id: customers.id,
            customerNo:
              customers.customerNo,
          })

      const updatedCustomer =
        updatedCustomers[0]

      if (!updatedCustomer) {
        throw new Error(
          'Unable to assign customer number',
        )
      }

      return {
        user,
        customer: {
          ...customer,
          customerNo:
            updatedCustomer.customerNo,
        },
      }
    },
  )
}