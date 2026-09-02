import { z } from 'zod'

import {
  findCategoryByName,
  findManagedCategories,
  insertManagedCategory,
} from './category-management-repository'

export const createCategorySchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        1,
        'Category name is required.',
      )
      .max(120),

    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal('')),

    isActive: z.boolean(),
  })

export async function listManagedCategories() {
  return findManagedCategories()
}

export async function createManagedCategory(
  input: z.infer<
    typeof createCategorySchema
  >,
) {
  const existing =
    await findCategoryByName(
      input.name,
    )

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Category name already exists',
    })
  }

  const category =
    await insertManagedCategory({
      name: input.name,

      description:
        input.description || null,

      isActive:
        input.isActive,
    })

  if (!category) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to create category',
    })
  }

  return category
}