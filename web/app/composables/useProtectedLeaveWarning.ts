export function useProtectedLeaveWarning() {
  const {
    loggedIn,
  } = useUserSession()

  const router = useRouter()

  const showLeaveWarning =
    ref(false)

  /*
   * True only when navigation was triggered
   * by the browser Back button.
   */
  let browserBackTriggered = false

  /*
   * Allows the browser Back navigation after
   * the user confirms "Leave page".
   */
  let allowNextNavigation = false

  /*
   * Keep track of the current browser history
   * position so we can distinguish Back from
   * normal Nuxt navigation.
   */
  let currentHistoryPosition = 0

  function handlePopState(
    event: PopStateEvent,
  ) {
    const nextPosition =
      event.state?.position

    if (
      typeof nextPosition !== 'number'
    ) {
      return
    }

    /*
     * A lower history position means the
     * browser Back button was used.
     */
    browserBackTriggered =
      nextPosition <
      currentHistoryPosition

    currentHistoryPosition =
      nextPosition
  }

  onMounted(() => {
    const position =
      window.history.state?.position

    if (
      typeof position === 'number'
    ) {
      currentHistoryPosition =
        position
    }

    window.addEventListener(
      'popstate',
      handlePopState,
    )
  })

  onBeforeUnmount(() => {
    window.removeEventListener(
      'popstate',
      handlePopState,
    )
  })

  onBeforeRouteLeave(() => {
    /*
     * Never block navigation after logout.
     */
    if (!loggedIn.value) {
      showLeaveWarning.value = false
      browserBackTriggered = false

      return true
    }

    /*
     * User already confirmed the browser
     * Back navigation.
     */
    if (allowNextNavigation) {
      allowNextNavigation = false
      browserBackTriggered = false

      return true
    }

    /*
     * IMPORTANT:
     *
     * Normal BrewHub navigation is allowed.
     *
     * Examples:
     * - NuxtLink
     * - sidebar navigation
     * - buttons
     * - navigateTo()
     * - router.push()
     */
    if (!browserBackTriggered) {
      return true
    }

    /*
     * Browser Back was pressed.
     *
     * Stop it temporarily and show the
     * confirmation warning.
     */
    browserBackTriggered = false
    showLeaveWarning.value = true

    return false
  })

  async function continueNavigation() {
    showLeaveWarning.value = false

    /*
     * Allow the next browser Back operation
     * to pass through the route guard.
     */
    allowNextNavigation = true

    await nextTick()

    router.back()
  }

  function stayOnPage() {
    browserBackTriggered = false
    allowNextNavigation = false
    showLeaveWarning.value = false
  }

  /*
   * If logout occurs while the warning
   * is open, immediately close it.
   */
  watch(
    loggedIn,
    (isLoggedIn) => {
      if (!isLoggedIn) {
        showLeaveWarning.value = false
        browserBackTriggered = false
        allowNextNavigation = false
      }
    },
  )

  return {
    showLeaveWarning,
    continueNavigation,
    stayOnPage,
  }
}