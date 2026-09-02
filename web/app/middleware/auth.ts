export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch()

  try {
    // Ask the backend directly whether this request
    // has a valid BrewHub session.
    await requestFetch('/api/auth/me')
  }
  catch (error: any) {
    const statusCode =
      error?.statusCode
      ?? error?.response?.status

    if (statusCode === 401) {
      return navigateTo({
        path: '/login',
        query: {
          redirect: to.fullPath,
        },
      })
    }

    throw error
  }
})