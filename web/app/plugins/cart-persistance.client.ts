export default defineNuxtPlugin(() => {
  const cart =
    useCartStore()

  onNuxtReady(() => {
    cart.restoreCart()

    cart.$subscribe(
      () => {
        cart.persistCart()
      },
      {
        detached: true,
      },
    )
  })
})