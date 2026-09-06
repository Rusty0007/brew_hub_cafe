import {
  asc,
  eq,
  sql,
} from 'drizzle-orm'

import {
  auditLogs,
  categories,
  products,
} from '#server/db/schema'
import { useDb } from '#server/utils/db'

export async function findManagedProducts() {
  const db = useDb()

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      basePrice: products.basePrice,
      trackInventory: products.trackInventory,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,

      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(
      categories,
      eq(
        categories.id,
        products.categoryId,
      ),
    )
    .orderBy(
      asc(products.name),
    )
}

export async function findManagedProductBySku(
  sku: string,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
    })
    .from(products)
    .where(
      sql`
        lower(${products.sku})
        = lower(${sku})
      `,
    )
    .limit(1)

  return rows[0] ?? null
}

export async function findManagedCategoryById(
  categoryId: number,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      isActive: categories.isActive,
    })
    .from(categories)
    .where(
      eq(
        categories.id,
        categoryId,
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

interface CreateManagedProductInput {
  sku: string
  name: string
  description: string | null
  categoryId: number | null
  basePrice: string
  trackInventory: boolean
  isActive: boolean
}

export async function insertManagedProduct(
  input: CreateManagedProductInput,
) {
  const db = useDb()

  const rows = await db
    .insert(products)
    .values({
      sku: input.sku,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      trackInventory: input.trackInventory,
      isActive: input.isActive,
    })
    .returning({
      id: products.id,
      sku: products.sku,
      name: products.name,
      basePrice: products.basePrice,
      categoryId: products.categoryId,
      trackInventory: products.trackInventory,
      isActive: products.isActive,
    })

  return rows[0]
}

export async function findManagedProductById(
  productId: number,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      basePrice: products.basePrice,
      categoryId: products.categoryId,
      trackInventory: products.trackInventory,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(
      eq(products.id, productId),
    )
    .limit(1)

  return rows[0] ?? null
}

interface UpdateManagedProductInput {
  name?: string
  description?: string | null
  categoryId?: number | null
  basePrice?: string
  trackInventory?: boolean
  isActive?: boolean
}

interface PriceChangeAuditContext {
  actorUserId: number
  reason: string
  traceId?: string | null
}

export async function updateManagedProduct(
  productId: number,
  input: UpdateManagedProductInput,
  priceAudit?: PriceChangeAuditContext,
) {
  const db = useDb()

  return await db.transaction(
    async (tx) => {
      const currentRows =
        await tx
          .select({
            id:
              products.id,

            basePrice:
              products.basePrice,
          })
          .from(
            products,
          )
          .where(
            eq(
              products.id,
              productId,
            ),
          )
          .limit(1)

      const currentProduct =
        currentRows[0]

      if (!currentProduct) {
        return null
      }

      const rows =
        await tx
          .update(
            products,
          )
          .set(
            input,
          )
          .where(
            eq(
              products.id,
              productId,
            ),
          )
          .returning({
            id:
              products.id,

            sku:
              products.sku,

            name:
              products.name,

            description:
              products.description,

            basePrice:
              products.basePrice,

            categoryId:
              products.categoryId,

            trackInventory:
              products.trackInventory,

            isActive:
              products.isActive,
          })

      const updatedProduct =
        rows[0]

      if (!updatedProduct) {
        return null
      }

      const priceChanged =
        input.basePrice !== undefined
        && Number(
          currentProduct.basePrice,
        )
        !== Number(
          updatedProduct.basePrice,
        )

      if (priceChanged) {
  const auditReason =
    priceAudit?.reason.trim()

  /*
   * A price modification is an
   * audit-sensitive operation.
   *
   * Never allow the product price
   * update to commit without the
   * actor and reason needed for its
   * audit record.
   *
   * Because this runs inside the same
   * transaction as the product update,
   * throwing here rolls the price
   * update back as well.
   */
  if (
    !priceAudit
    || !auditReason
    ) {
      throw new Error(
        'Price change requires audit context and reason',
      )
    }

    await tx
      .insert(
        auditLogs,
      )
      .values({
        actorUserId:
          priceAudit.actorUserId,

        action:
          'product.price_change',

        resourceType:
          'product',

        resourceId:
          String(
            productId,
          ),

        beforeData: {
          basePrice:
            Number(
              currentProduct.basePrice,
            ),
        },

        afterData: {
          basePrice:
            Number(
              updatedProduct.basePrice,
            ),
        },

        reason:
          auditReason,

        traceId:
          priceAudit.traceId
          ?? null,
      })
  }

      return updatedProduct
    },
  )
}
