import { z } from 'zod'
import {
    findManagedCategoryById,
    findManagedProductById,
    findManagedProductBySku,
    findManagedProducts,
    insertManagedProduct,
    updateManagedProduct
} from './management-repository'

export async function listManagedProducts() {
  const rows =
    await findManagedProducts()

  return rows.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,

    basePrice:
      Number(product.basePrice),

    trackInventory:
      product.trackInventory,

    isActive:
      product.isActive,

    category: product.categoryId
      ? {
          id: product.categoryId,
          name:
            product.categoryName
            ?? 'Unknown',
        }
      : null,

    createdAt:
      product.createdAt,

    updatedAt:
      product.updatedAt,
  }))
}

export const createManagedProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, 'SKU is required.')
    .max(80)
    .transform(
      value => value.toUpperCase(),
    ),

  name: z
    .string()
    .trim()
    .min(1, 'Product name is required.')
    .max(160),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal('')),

  categoryId: z
    .number()
    .int()
    .positive()
    .nullable(),

  basePrice: z
    .number()
    .finite()
    .min(
      0,
      'Price cannot be negative.',
    ),

  trackInventory: z.boolean(),

  isActive: z.boolean(),
})

export type CreateManagedProductInput =
  z.infer<
    typeof createManagedProductSchema
  >

export async function createManagedProduct(
  input: CreateManagedProductInput,
) {
  const existing =
    await findManagedProductBySku(
      input.sku,
    )

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'A product with this SKU already exists',
    })
  }

  if (input.categoryId !== null) {
    const category =
      await findManagedCategoryById(
        input.categoryId,
      )

    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Selected category does not exist',
      })
    }

    if (!category.isActive) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Selected category is inactive',
      })
    }
  }

  const product =
    await insertManagedProduct({
      sku: input.sku,
      name: input.name,

      description:
        input.description || null,

      categoryId:
        input.categoryId,

      basePrice:
        input.basePrice.toFixed(2),

      trackInventory:
        input.trackInventory,

      isActive:
        input.isActive,
    })

  if (!product) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to create product',
    })
  }

  return {
    ...product,

    basePrice:
      Number(product.basePrice),
  }
}

export const updateManagedProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal('')),

    categoryId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    basePrice: z
      .number()
      .finite()
      .min(0)
      .optional(),

    reason: z
      .string()
      .trim()
      .max(500)
      .optional(),

    trackInventory:
      z.boolean().optional(),

    isActive:
      z.boolean().optional(),
  })
  .refine(
  data =>
    data.name !== undefined
    || data.description !== undefined
    || data.categoryId !== undefined
    || data.basePrice !== undefined
    || data.trackInventory !== undefined
    || data.isActive !== undefined,
  {
    message:
      'No product changes supplied.',
  },
)

export type UpdateManagedProductInput =
  z.infer<
    typeof updateManagedProductSchema
  >

export async function getManagedProduct(
  productId: number,
) {
  const product =
    await findManagedProductById(
      productId,
    )

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage:
        'Product not found',
    })
  }

  return {
    ...product,
    basePrice:
      Number(product.basePrice),
  }
}

interface EditManagedProductAuditContext {
  actorUserId: number
  reason: string
  traceId?: string | null
}

export async function editManagedProduct(
  productId: number,
  input: UpdateManagedProductInput,
  auditContext?: EditManagedProductAuditContext,
) {
  const existingProduct =
  await getManagedProduct(
    productId,
  )

  const priceChanged =
  input.basePrice !== undefined
  && input.basePrice
  !== existingProduct.basePrice

if (
  priceChanged
  && !input.reason?.trim()
) {
  throw createError({
    statusCode: 400,
    statusMessage:
      'Price change reason is required',
  })
}

  if (
    input.categoryId !== undefined
    && input.categoryId !== null
  ) {
    const category =
      await findManagedCategoryById(
        input.categoryId,
      )

    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Selected category does not exist',
      })
    }

    if (!category.isActive) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Selected category is inactive',
      })
    }
  }

  const changes: {
    name?: string
    description?: string | null
    categoryId?: number | null
    basePrice?: string
    trackInventory?: boolean
    isActive?: boolean
  } = {}

  if (input.name !== undefined) {
    changes.name = input.name
  }

  if (input.description !== undefined) {
    changes.description =
      input.description || null
  }

  if (input.categoryId !== undefined) {
    changes.categoryId =
      input.categoryId
  }

  if (input.basePrice !== undefined) {
    changes.basePrice =
      input.basePrice.toFixed(2)
  }

  if (
    input.trackInventory !== undefined
  ) {
    changes.trackInventory =
      input.trackInventory
  }

  if (input.isActive !== undefined) {
    changes.isActive =
      input.isActive
  }

  const product =
    await updateManagedProduct(
      productId,
      changes,
      auditContext,
    )

  if (!product) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Unable to update product',
    })
  }

  return {
    ...product,
    basePrice:
      Number(product.basePrice),
  }
}