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

export default defineNuxtRouteMiddleware(
  async (to) => {
    const requestFetch =
      useRequestFetch()

    try {
      const response =
        await requestFetch<MeResponse>(
          '/api/auth/me',
        )

      const roles =
        response.user.roles

      const isCashier =
        roles.includes('CASHIER')

      const isManager =
        roles.includes('MANAGER')

      /*
       * The Cashier Workspace itself is
       * cashier-only.
       *
       * POS and Recent Orders are shared
       * operational areas, so managers
       * may still access those routes.
       */
      if (
        to.path === '/staff/cashier'
      ) {
        if (!isCashier) {
          if (isManager) {
            return navigateTo(
              '/staff/manager',
            )
          }

          return navigateTo('/staff')
        }

        return
      }

      /*
       * Other routes using this middleware,
       * such as POS and staff orders, may
       * be used by either role.
       */
      const allowed =
        isCashier || isManager

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
  },
)