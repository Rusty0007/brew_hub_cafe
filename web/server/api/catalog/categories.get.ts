import { getCategories } from '#server/domains/catalog/service'

export default defineEventHandler(async () => {
  const categories = await getCategories(50)

  return {
    data: categories,
    meta: {
      count: categories.length,
      limit: 50,
    },
  }
})