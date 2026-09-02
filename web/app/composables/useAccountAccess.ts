export function useAccountAccess() {
  const {
    loggedIn,
    user,
  } = useUserSession()

  const roles = computed<string[]>(
    () =>
      (user.value as any)?.roles ?? [],
  )

  const isAdmin = computed(
    () => roles.value.includes('ADMIN'),
  )

  const isManager = computed(
    () => roles.value.includes('MANAGER'),
  )

  const isCashier = computed(
    () => roles.value.includes('CASHIER'),
  )

  const isStaff = computed(
    () =>
      isAdmin.value
      || isManager.value
      || isCashier.value,
  )

  const isCustomer = computed(
    () =>
      loggedIn.value
      && !isStaff.value,
  )

  const workspaceDestination = computed(() => {
    if (isAdmin.value) {
      return '/admin'
    }

    if (isManager.value) {
      return '/staff/manager'
    }

    if (isCashier.value) {
      return '/staff/cashier'
    }

    return '/account'
  })

  return {
    loggedIn,
    user,
    roles,
    isAdmin,
    isManager,
    isCashier,
    isStaff,
    isCustomer,
    workspaceDestination,
  }
}