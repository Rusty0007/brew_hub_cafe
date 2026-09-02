export default defineNuxtRouteMiddleware(
  async (to) => {
    const {
      loggedIn,
      isStaff,
      isCustomer,
    } = useAccountAccess()

    /*
     * Authentication should normally be
     * handled by the auth middleware,
     * but keep this defensive check here.
     */
    if (!loggedIn.value) {
      return navigateTo({
        path: '/login',
        query: {
          redirect: to.fullPath,
        },
      })
    }

    /*
     * Never query the Customer domain
     * for staff accounts.
     */
    if (isStaff.value) {
      return navigateTo(
        '/staff/manager',
      )
    }

    /*
     * A logged-in non-staff account
     * should represent a customer.
     */
    if (!isCustomer.value) {
      return navigateTo('/')
    }

    try {
      const requestFetch =
        useRequestFetch()

      await requestFetch(
        '/api/customer/me',
      )
    }
    catch (error: unknown) {
      const statusCode =
        getStatusCode(error)

      if (statusCode === 401) {
        return navigateTo({
          path: '/login',
          query: {
            redirect: to.fullPath,
          },
        })
      }

      if (
        statusCode === 403
        || statusCode === 404
      ) {
        return navigateTo('/')
      }

      throw error
    }
  },
)

function getStatusCode(
  error: unknown,
) {
  if (
    typeof error !== 'object'
    || error === null
  ) {
    return undefined
  }

  if (
    'statusCode' in error
    && typeof error.statusCode
      === 'number'
  ) {
    return error.statusCode
  }

  if (
    'response' in error
    && typeof error.response
      === 'object'
    && error.response !== null
    && 'status' in error.response
    && typeof error.response.status
      === 'number'
  ) {
    return error.response.status
  }

  return undefined
}