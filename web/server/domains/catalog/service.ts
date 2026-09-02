import {
  findCategories,
  findProducts,
  findProductsByIds,
  type ProductQueryOptions,
} from './repository'

function normalizeLimit(limit = 20) {
  return Math.min(
    Math.max(limit, 1),
    100,
  )
}

function normalizeOffset(offset = 0) {
  return Math.max(offset, 0)
}

export async function getProducts(
  options: ProductQueryOptions = {},
) {
  return findProducts({
    ...options,
    categoryId: options.categoryId,
    search: options.search?.trim() || undefined,
    limit: normalizeLimit(options.limit),
    offset: normalizeOffset(options.offset),
  })
}

export async function getCategories(
  limit = 50,
) {
  return findCategories(
    normalizeLimit(limit),
  )
}

export async function getOrderableProducts(
  productIds: number[],
) {
  const uniqueIds = [
    ...new Set(productIds),
  ]

  const products =
    await findProductsByIds(
      uniqueIds,
    )

  return products
    .filter(
      product =>
        product.isActive,
    )
    .map(product => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice:
        Number(product.basePrice),
      trackInventory:
        product.trackInventory,
    }))
}