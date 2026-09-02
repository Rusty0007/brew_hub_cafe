import {
  asc,
  eq,
  sql,
} from 'drizzle-orm'

import {
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

export async function updateManagedProduct(
  productId: number,
  input: UpdateManagedProductInput,
) {
  const db = useDb()

  const rows = await db
    .update(products)
    .set(input)
    .where(
      eq(products.id, productId),
    )
    .returning({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      basePrice: products.basePrice,
      categoryId: products.categoryId,
      trackInventory: products.trackInventory,
      isActive: products.isActive,
    })

  return rows[0] ?? null
}