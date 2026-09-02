interface CurrentUser {
  id: number
  username: string
  displayName: string
  email: string | null
  roles: string[]
}

interface MeResponse {
  user: CurrentUser
}

export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()

  try {
    const response = await requestFetch<MeResponse>(
      '/api/auth/me',
    )

    const allowed =
      response.user.roles.includes('MANAGER')

    if (!allowed) {
      return navigateTo('/staff')
    }
  }
  catch (error: any) {
    const statusCode =
      error?.statusCode
      ?? error?.response?.status

    if (statusCode === 401) {
      return navigateTo('/login')
    }

    throw error
  }
})