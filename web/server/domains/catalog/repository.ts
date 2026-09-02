import { and, asc, count, eq, ilike, inArray, or, } from 'drizzle-orm'
import { categories, products } from '#server/db/schema'
import { useDb } from '#server/utils/db'

export interface ProductQueryOptions {
  categoryId?: number
  search?: string
  limit?: number
  offset?: number
}

export async function findProducts(options: ProductQueryOptions = {},
  ) {
    const db = useDb()

    const {
      categoryId,
      search,
      limit = 20,
      offset = 0,
    } = options

    const conditions = [
      eq(products.isActive, true),
    ]

    if (categoryId) {
      conditions.push(
        eq(products.categoryId, categoryId),
      )
    }

    if (search) {
      const searchCondition = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
      )

    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  const whereCondition = and(...conditions)

  const data = await db
    .select()
    .from(products)
    .where(whereCondition)
    .orderBy(asc(products.name))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({
      total: count(),
    })
    .from(products)
    .where(whereCondition)

  const total = totalResult[0]?.total ?? 0

  return {
    data,
    total,
  }
}

export async function findCategories(
  limit = 50,
) {
  const db = useDb()

  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name))
    .limit(limit)
}

export async function findProductsByIds(
  productIds: number[],
) {
  const db = useDb()

  if (productIds.length === 0) {
    return []
  }

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      basePrice: products.basePrice,
      isActive: products.isActive,
      trackInventory: products.trackInventory,
    })
    .from(products)
    .where(
      inArray(
        products.id,
        productIds,
      ),
    )
}