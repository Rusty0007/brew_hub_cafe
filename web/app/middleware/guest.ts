export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  // Logged-in users do not need the login page.
  if (loggedIn.value) {
    return navigateTo('/staff')
  }
})