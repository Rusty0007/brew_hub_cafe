import {
  asc,
  sql,
} from 'drizzle-orm'

import {
  categories,
} from '#server/db/schema'

import { useDb } from '#server/utils/db'

export async function findManagedCategories() {
  const db = useDb()

  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .orderBy(
      asc(categories.name),
    )
}

export async function findCategoryByName(
  name: string,
) {
  const db = useDb()

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .where(
      sql`
        lower(${categories.name})
        = lower(${name})
      `,
    )
    .limit(1)

  return rows[0] ?? null
}

interface InsertCategoryInput {
  name: string
  description: string | null
  isActive: boolean
}

export async function insertManagedCategory(
  input: InsertCategoryInput,
) {
  const db = useDb()

  const rows = await db
    .insert(categories)
    .values({
      name: input.name,
      description: input.description,
      isActive: input.isActive,
    })
    .returning({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      isActive: categories.isActive,
    })

  return rows[0] ?? null
}