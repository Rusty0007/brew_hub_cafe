import { z } from 'zod'

import {
  getProducts,
} from '#server/domains/catalog/service'

const querySchema = z.object({
  categoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  search: z
    .string()
    .trim()
    .max(100)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
})

export default defineEventHandler(async (event) => {
  // Read query parameters from the URL.
  const query = getQuery(event)

  // Validate and convert query values with Zod.
  const parsed = querySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid catalog query',
      data: parsed.error.flatten(),
    })
  }

  const {
    categoryId,
    search,
    limit,
    offset,
  } = parsed.data

  // Pass validated filters to the Catalog service.
  const result = await getProducts({
    categoryId,
    search: search || undefined,
    limit,
    offset,
  })

  return {
    data: result.data,

    meta: {
      count: result.data.length,
      total: result.total,
      limit,
      offset,
      categoryId: categoryId ?? null,
      search: search || null,
    },
  }
})