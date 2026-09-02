<script setup lang="ts">
interface Product {
  id: number
  sku: string
  name: string
  description?: string | null
  basePrice: string | number
}

const props = defineProps<{
  product: Product
  imageUrl?: string | null
}>()

const emit = defineEmits<{
  close: []
  addToCart: []
}>()

const formattedPrice = computed(() => {
  const price = Number(
    props.product.basePrice,
  )

  if (Number.isNaN(price)) {
    return String(
      props.product.basePrice,
    )
  }

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
    },
  ).format(price)
})

let previousBodyOverflow = ''

function close() {
  emit('close')
}

function addToCart() {
  emit('addToCart')
}

function handleKeydown(
  event: KeyboardEvent,
) {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  previousBodyOverflow =
    document.body.style.overflow

  document.body.style.overflow =
    'hidden'

  window.addEventListener(
    'keydown',
    handleKeydown,
  )
})

onUnmounted(() => {
  document.body.style.overflow =
    previousBodyOverflow

  window.removeEventListener(
    'keydown',
    handleKeydown,
  )
})
</script>

<template>
  <Teleport to="body">
    <div
      class="
        fixed inset-0 z-50
        flex
        items-center justify-center
        bg-black/50
        px-4 py-8
        backdrop-blur-sm
      "
      @click.self="close"
    >
      <section
        class="
          relative
          max-h-[90vh]
          w-full
          max-w-3xl
          overflow-y-auto
          rounded-3xl
          bg-[#fffaf3]
          shadow-2xl
        "
        role="dialog"
        aria-modal="true"
        :aria-label="product.name"
      >
        <!-- CLOSE -->
        <button
          type="button"
          class="
            absolute
            right-4 top-4 z-10
            flex size-10
            items-center justify-center
            rounded-full
            bg-white/90
            text-2xl
            text-brew-900
            shadow-sm
            transition
            hover:bg-white
          "
          aria-label="Close product details"
          @click="close"
        >
          ×
        </button>

        <div
          class="
            grid
            md:grid-cols-2
          "
        >
          <!-- IMAGE -->
          <div
            class="
              aspect-square
              overflow-hidden
              bg-brew-100
              md:aspect-auto
              md:min-h-120
            "
          >
            <img
              v-if="imageUrl"
              :src="imageUrl"
              :alt="product.name"
              class="
                size-full
                object-cover
              "
            >

            <div
              v-else
              class="
                flex size-full
                min-h-80
                items-center justify-center
              "
            >
              <div
                class="
                  flex size-24
                  items-center justify-center
                  rounded-full
                  bg-brew-900
                  text-brew-100
                "
              >
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  class="size-12"
                  aria-hidden="true"
                >
                  <path
                    d="M15 23h31v15c0 9-7 16-16 16S15 47 15 38V23Z"
                    stroke="currentColor"
                    stroke-width="3"
                  />

                  <path
                    d="M46 28h3a8 8 0 0 1 0 16h-5"
                    stroke="currentColor"
                    stroke-width="3"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- DETAILS -->
          <div
            class="
              flex flex-col
              p-7
              md:p-10
            "
          >
            <p
              class="
                text-xs
                font-semibold
                uppercase
                tracking-[0.2em]
                text-brew-500
              "
            >
              {{ product.sku }}
            </p>

            <h2
              class="
                mt-3
                text-3xl
                font-semibold
                tracking-tight
                text-brew-900
              "
            >
              {{ product.name }}
            </h2>

            <p
              class="
                mt-5
                text-sm
                leading-7
                text-brew-600
              "
            >
              {{
                product.description
                  || 'Freshly prepared by BrewHub Cafe.'
              }}
            </p>

            <p
              class="
                mt-7
                text-2xl
                font-semibold
                text-brew-800
              "
            >
              {{ formattedPrice }}
            </p>

            <div class="mt-auto pt-8">
              <button
                type="button"
                class="
                  w-full
                  rounded-2xl
                  bg-brew-900
                  px-5 py-3.5
                  font-semibold
                  text-white
                  transition
                  hover:bg-brew-800
                "
                @click="addToCart"
              >
                Add to cart
              </button>

              <button
                type="button"
                class="
                  mt-3
                  w-full
                  rounded-2xl
                  border border-brew-200
                  px-5 py-3
                  font-semibold
                  text-brew-700
                  transition
                  hover:bg-brew-50
                "
                @click="close"
              >
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>