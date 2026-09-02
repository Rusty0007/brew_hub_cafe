import { defineStore } from 'pinia'

export interface CartItem {
  productId: number
  sku: string
  name: string
  unitPrice: number
  quantity: number
}

export interface AddToCartProduct {
  id: number
  sku: string
  name: string
  basePrice: string | number
}

export const useCartStore =
  defineStore(
    'cart',
    () => {
      const items =
        ref<CartItem[]>([])

      const totalItems =
        computed(() =>
          items.value.reduce(
            (
              total,
              item,
            ) =>
              total
              + item.quantity,
            0,
          ),
        )

      const subtotal =
        computed(() =>
          items.value.reduce(
            (
              total,
              item,
            ) =>
              total
              + (
                item.unitPrice
                * item.quantity
              ),
            0,
          ),
        )

      function addProduct(
        product:
          AddToCartProduct,
        quantity = 1,
      ) {
        if (
          !Number.isInteger(
            quantity,
          )
          || quantity <= 0
        ) {
          return
        }

        const existingItem =
          items.value.find(
            item =>
              item.productId
              === product.id,
          )

        if (existingItem) {
          existingItem.quantity =
            Math.min(
              existingItem.quantity
              + quantity,
              100,
            )

          return
        }

        items.value.push({
          productId:
            product.id,

          sku:
            product.sku,

          name:
            product.name,

          unitPrice:
            Number(
              product.basePrice,
            ),

          quantity:
            Math.min(
              quantity,
              100,
            ),
        })
      }

      function setQuantity(
        productId: number,
        quantity: number,
      ) {
        const item =
          items.value.find(
            item =>
              item.productId
              === productId,
          )

        if (!item) {
          return
        }

        if (quantity <= 0) {
          removeProduct(
            productId,
          )

          return
        }

        item.quantity =
          Math.min(
            Math.floor(
              quantity,
            ),
            100,
          )
      }

      function increment(
        productId: number,
      ) {
        const item =
          items.value.find(
            item =>
              item.productId
              === productId,
          )

        if (!item) {
          return
        }

        item.quantity =
          Math.min(
            item.quantity + 1,
            100,
          )
      }

      function decrement(
        productId: number,
      ) {
        const item =
          items.value.find(
            item =>
              item.productId
              === productId,
          )

        if (!item) {
          return
        }

        if (item.quantity <= 1) {
          removeProduct(
            productId,
          )

          return
        }

        item.quantity--
      }

      function removeProduct(
        productId: number,
      ) {
        items.value =
          items.value.filter(
            item =>
              item.productId
              !== productId,
          )
      }

      function clearCart() {
        items.value = []
      }

      function restoreCart() {
        if (!import.meta.client) {
          return
        }
      
        const saved =
          localStorage.getItem(
            'brewhub-cart',
          )
        
        if (!saved) {
          return
        }
      
        try {
          const parsed =
            JSON.parse(saved)
        
          if (!Array.isArray(parsed)) {
            return
          }
        
          items.value =
            parsed.filter(
              (
                item,
              ): item is CartItem => {
                return (
                  typeof item?.productId
                    === 'number'
                  && typeof item?.sku
                    === 'string'
                  && typeof item?.name
                    === 'string'
                  && typeof item?.unitPrice
                    === 'number'
                  && Number.isInteger(
                    item?.quantity,
                  )
                  && item.quantity > 0
                  && item.quantity <= 100
                )
              },
            )
        }
        catch {
          localStorage.removeItem(
            'brewhub-cart',
          )
        }
      }

      function persistCart() {
        if (!import.meta.client) {
          return
        }
      
        if (items.value.length === 0) {
          localStorage.removeItem(
            'brewhub-cart',
          )
        
          return
        }
      
        localStorage.setItem(
          'brewhub-cart',
          JSON.stringify(
            items.value,
          ),
        )
      }

      return {
        items,
        totalItems,
        subtotal,

        addProduct,
        setQuantity,
        increment,
        decrement,
        removeProduct,
        clearCart,

        restoreCart,
        persistCart
      }
    },
  )