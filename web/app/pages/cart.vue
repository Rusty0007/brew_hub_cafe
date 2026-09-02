<script setup lang="ts">
const cart = useCartStore()

const {
  loggedIn,
} = useUserSession()

const orderType =
  ref<'DINE_IN' | 'TAKEOUT'>(
    'TAKEOUT',
  )

const submitting =
  ref(false)

const errorMessage =
  ref('')

const createdOrder =
  ref<{
    id: number
    orderNo: string
    totalAmount: number
  } | null>(null)

const formattedSubtotal =
  computed(() =>
    formatPrice(
      cart.subtotal,
    ),
  )

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  ).format(value)
}

const {
  createTraceId,
  saveTraceId,
} = useCheckoutTrace()

async function placeOrder() {
  errorMessage.value = ''
  createdOrder.value = null

  if (
    cart.items.length === 0
  ) {
    return
  }

  /*
   * Guests may build a cart,
   * but must sign in before
   * creating an order.
   */
  if (!loggedIn.value) {
    await navigateTo(
      '/login?redirect=/cart',
    )

    return
  }

  const checkoutTraceId =
  createTraceId()

  submitting.value = true

  try {
    const response =
      await $fetch<{
        message: string
        order: {
          id: number
          orderNo: string
          totalAmount: number
        }
      }>(
        '/api/customer/orders',
        {
          method: 'POST',

          headers: {
              'X-Trace-Id':
                checkoutTraceId,
            },

          body: {
            orderType:
              orderType.value,

            /*
             * Never send browser
             * prices to Ordering.
             */
            items:
              cart.items.map(
                item => ({
                  productId:
                    item.productId,

                  quantity:
                    item.quantity,
                }),
              ),
          },
        },
      )

          saveTraceId(
      response.order.id,
      checkoutTraceId,
    )

    createdOrder.value = {
      id:
        response.order.id,

      orderNo:
        response.order.orderNo,

      totalAmount:
        response.order.totalAmount,
    }

    cart.clearCart()
  }
  catch (error) {
    const requestError =
      error as {
        data?: {
          statusMessage?: string
          message?: string
        }
      }

    errorMessage.value =
      requestError.data
        ?.statusMessage
      ?? requestError.data
        ?.message
      ?? 'Unable to place your order.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <main
    class="
      mx-auto
      w-full max-w-6xl
      px-4
      py-10
      sm:px-6
      lg:px-8
    "
  >
    <!-- HEADER -->
    <div
      class="
        flex flex-col
        gap-3
        sm:flex-row
        sm:items-end
        sm:justify-between
      "
    >
      <div>
        <p
          class="
            text-xs
            font-semibold
            uppercase
            tracking-[0.22em]
            text-brew-500
          "
        >
          Your order
        </p>

        <h1
          class="
            mt-2
            text-3xl
            font-semibold
            tracking-tight
            text-brew-900
          "
        >
          Your cart
        </h1>

        <p
          class="
            mt-2
            text-sm
            text-brew-500
          "
        >
          Review your items before
          placing your order.
        </p>
      </div>

      <NuxtLink
        to="/catalog"
        class="
          text-sm
          font-semibold
          text-brew-700
          hover:text-brew-900
        "
      >
        ← Continue browsing
      </NuxtLink>
    </div>

    <!-- SUCCESS -->
    <section
      v-if="createdOrder"
      class="
        mt-8
        rounded-3xl
        border
        border-green-200
        bg-green-50
        p-6
      "
    >
      <p
        class="
          text-sm
          font-semibold
          text-green-800
        "
      >
        Order created successfully
      </p>

      <h2
        class="
          mt-2
          text-2xl
          font-semibold
          text-brew-900
        "
      >
        {{ createdOrder.orderNo }}
      </h2>

      <p
        class="
          mt-2
          text-sm
          text-brew-600
        "
      >
        Your order has been saved as
        a draft. Inventory and payment
        processing will be connected
        in the next stage.
      </p>

      <p
        class="
          mt-4
          font-semibold
          text-brew-800
        "
      >
        Total:
        {{
          formatPrice(
            createdOrder.totalAmount,
          )
        }}
      </p>

      <NuxtLink
        to="/catalog"
        class="
          mt-5
          inline-flex
          rounded-2xl
          bg-brew-900
          px-5 py-3
          text-sm
          font-semibold
          text-white
        "
      >
        Back to menu
      </NuxtLink>
    </section>

    <!-- EMPTY CART -->
    <section
      v-else-if="
        cart.items.length === 0
      "
      class="
        mt-8
        rounded-3xl
        border
        border-brew-100
        bg-white
        px-6 py-16
        text-center
        shadow-sm
      "
    >
      <div
        class="
          mx-auto
          flex size-16
          items-center
          justify-center
          rounded-full
          bg-brew-100
          text-brew-800
        "
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          class="size-7"
          aria-hidden="true"
        >
          <path
            d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <circle
            cx="10"
            cy="19"
            r="1"
            fill="currentColor"
          />

          <circle
            cx="18"
            cy="19"
            r="1"
            fill="currentColor"
          />
        </svg>
      </div>

      <h2
        class="
          mt-5
          text-xl
          font-semibold
          text-brew-900
        "
      >
        Your cart is empty
      </h2>

      <p
        class="
          mt-2
          text-sm
          text-brew-500
        "
      >
        Choose something from the
        BrewHub menu to get started.
      </p>

      <NuxtLink
        to="/catalog"
        class="
          mt-6
          inline-flex
          rounded-2xl
          bg-brew-900
          px-5 py-3
          text-sm
          font-semibold
          text-white
        "
      >
        Browse menu
      </NuxtLink>
    </section>

    <!-- CART CONTENT -->
    <div
      v-else
      class="
        mt-8
        grid
        gap-8
        lg:grid-cols-[1fr_360px]
      "
    >
      <!-- ITEMS -->
      <section
        class="
          overflow-hidden
          rounded-3xl
          border
          border-brew-100
          bg-white
          shadow-sm
        "
      >
        <div
          class="
            border-b
            border-brew-100
            px-6 py-5
          "
        >
          <h2
            class="
              font-semibold
              text-brew-900
            "
          >
            Items
          </h2>
        </div>

        <div
          class="
            divide-y
            divide-brew-100
          "
        >
          <article
            v-for="
              item in cart.items
            "
            :key="item.productId"
            class="
              flex flex-col
              gap-5
              p-6
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h3
                class="
                  font-semibold
                  text-brew-900
                "
              >
                {{ item.name }}
              </h3>

              <p
                class="
                  mt-1
                  text-xs
                  uppercase
                  tracking-wider
                  text-brew-500
                "
              >
                {{ item.sku }}
              </p>

              <p
                class="
                  mt-2
                  text-sm
                  font-semibold
                  text-brew-700
                "
              >
                {{
                  formatPrice(
                    item.unitPrice,
                  )
                }}
              </p>
            </div>

            <div
              class="
                flex items-center
                gap-4
              "
            >
              <!-- QUANTITY -->
              <div
                class="
                  flex
                  items-center
                  rounded-2xl
                  border
                  border-brew-200
                  bg-brew-50
                  p-1
                "
              >
                <button
                  type="button"
                  class="
                    flex size-9
                    items-center
                    justify-center
                    rounded-xl
                    text-lg
                    text-brew-800
                    transition
                    hover:bg-white
                  "
                  :aria-label="
                    `Decrease ${item.name}`
                  "
                  @click="
                    cart.decrement(
                      item.productId,
                    )
                  "
                >
                  −
                </button>

                <span
                  class="
                    min-w-10
                    text-center
                    text-sm
                    font-semibold
                    text-brew-900
                  "
                >
                  {{ item.quantity }}
                </span>

                <button
                  type="button"
                  class="
                    flex size-9
                    items-center
                    justify-center
                    rounded-xl
                    text-lg
                    text-brew-800
                    transition
                    hover:bg-white
                  "
                  :aria-label="
                    `Increase ${item.name}`
                  "
                  @click="
                    cart.increment(
                      item.productId,
                    )
                  "
                >
                  +
                </button>
              </div>

              <div
                class="
                  min-w-24
                  text-right
                  font-semibold
                  text-brew-900
                "
              >
                {{
                  formatPrice(
                    item.unitPrice
                    * item.quantity,
                  )
                }}
              </div>

              <button
                type="button"
                class="
                  text-sm
                  font-medium
                  text-red-600
                  hover:text-red-700
                "
                @click="
                  cart.removeProduct(
                    item.productId,
                  )
                "
              >
                Remove
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- ORDER SUMMARY -->
      <aside
        class="
          h-fit
          rounded-3xl
          border
          border-brew-100
          bg-white
          p-6
          shadow-sm
          lg:sticky
          lg:top-24
        "
      >
        <h2
          class="
            text-lg
            font-semibold
            text-brew-900
          "
        >
          Order summary
        </h2>

        <fieldset class="mt-6">
          <legend
            class="
              text-sm
              font-semibold
              text-brew-700
            "
          >
            Order type
          </legend>

          <div
            class="
              mt-3
              grid grid-cols-2
              gap-2
            "
          >
            <button
              type="button"
              class="
                rounded-2xl
                border
                px-3 py-3
                text-sm
                font-semibold
                transition
              "
              :class="
                orderType === 'TAKEOUT'
                  ? 'border-brew-900 bg-brew-900 text-white'
                  : 'border-brew-200 text-brew-700 hover:bg-brew-50'
              "
              @click="
                orderType = 'TAKEOUT'
              "
            >
              Takeout
            </button>

            <button
              type="button"
              class="
                rounded-2xl
                border
                px-3 py-3
                text-sm
                font-semibold
                transition
              "
              :class="
                orderType === 'DINE_IN'
                  ? 'border-brew-900 bg-brew-900 text-white'
                  : 'border-brew-200 text-brew-700 hover:bg-brew-50'
              "
              @click="
                orderType = 'DINE_IN'
              "
            >
              Dine in
            </button>
          </div>
        </fieldset>

        <div
          class="
            mt-6
            space-y-3
            border-t
            border-brew-100
            pt-5
          "
        >
          <div
            class="
              flex
              justify-between
              text-sm
              text-brew-600
            "
          >
            <span>
              Items
            </span>

            <span>
              {{ cart.totalItems }}
            </span>
          </div>

          <div
            class="
              flex
              items-center
              justify-between
              border-t
              border-brew-100
              pt-4
            "
          >
            <span
              class="
                font-semibold
                text-brew-900
              "
            >
              Subtotal
            </span>

            <strong
              class="
                text-xl
                text-brew-900
              "
            >
              {{ formattedSubtotal }}
            </strong>
          </div>
        </div>

        <p
          class="
            mt-4
            text-xs
            leading-5
            text-brew-500
          "
        >
          Final prices are verified
          securely by BrewHub when
          your order is submitted.
        </p>

        <div
          v-if="errorMessage"
          class="
            mt-5
            rounded-2xl
            bg-red-50
            px-4 py-3
            text-sm
            text-red-700
          "
        >
          {{ errorMessage }}
        </div>

        <button
          type="button"
          class="
            mt-6
            w-full
            rounded-2xl
            bg-brew-900
            px-5 py-3.5
            font-semibold
            text-white
            transition
            hover:bg-brew-800
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
          :disabled="submitting"
          @click="placeOrder"
        >
          {{
            submitting
              ? 'Placing order...'
              : loggedIn
                ? 'Place order'
                : 'Sign in to order'
          }}
        </button>
      </aside>
    </div>
  </main>
</template>