<script setup lang="ts">

import ProductQuickViewModal from './ProductQuickViewModal.vue'

interface Product {
  id: number
  sku: string
  name: string
  description?: string | null
  basePrice: string | number
}

const props = withDefaults(
  defineProps<{
    product: Product
    enableQuickView?: boolean
  }>(),
  {
    enableQuickView: true,
  },
)

const cart = useCartStore()

const showQuickView = ref(false)
const recentlyAdded = ref(false)

let addedTimer:
  ReturnType<typeof setTimeout>
  | undefined

const productImages: Record<string, string> = {
  'COF-AMER-001': '/images/products/americano.png',
  'COF-LATT-001': '/images/products/cafe-latte.png',
  'COF-CAPP-001': '/images/products/cappuccino.png',
  'COF-MOCH-001': '/images/products/cafe-mocha.png',

  'TEA-MATC-001': '/images/products/matcha-latte.png',
  'TEA-MILK-001': '/images/products/classic-milk-tea.png',

  'NON-CHOCO-001': '/images/products/hot-chocolate.png',
  'NON-STRW-001': '/images/products/strawberry-cream.png',

  'PAS-CROI-001': '/images/products/butter-croissant.png',
  'PAS-MUFF-001': '/images/products/chocolate-muffin.png',

  'CLD-ILAT-001': '/images/products/ice-latte.png',
  'CLD-CBRW-001': '/images/products/cold-brew.png',
}

const imageUrl = computed(() => {
  return productImages[props.product.sku] ?? null
})

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

function openQuickView() {
  if (!props.enableQuickView) {
    return
  }

  showQuickView.value = true
}

function closeQuickView() {
  showQuickView.value = false
}

function addToCart() {
  cart.addProduct(
    props.product,
  )

  recentlyAdded.value = true

  if (addedTimer) {
    clearTimeout(addedTimer)
  }

  addedTimer = setTimeout(
    () => {
      recentlyAdded.value = false
    },
    1500,
  )
}

function addFromQuickView() {
  addToCart()
  closeQuickView()
}

onUnmounted(() => {
  if (addedTimer) {
    clearTimeout(addedTimer)
  }
})
</script>

<template>
  <article
    class="
      group
      overflow-hidden
      rounded-3xl
      border border-brew-100
      bg-white
      p-3
      shadow-sm
      transition
      duration-300
      hover:-translate-y-1
      hover:shadow-lg
    "
  >
    <!-- PRODUCT IMAGE -->
    <button
      type="button"
      class="
        block w-full
        text-left
      "
      :disabled="!enableQuickView"
      :aria-label="
        enableQuickView
          ? `View ${product.name}`
          : undefined
      "
      @click="openQuickView"
    >
      <div
        class="
          aspect-4/3
          overflow-hidden
          rounded-2xl
          bg-brew-100
        "
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="product.name"
          class="
            size-full
            object-cover
            transition
            duration-500
            group-hover:scale-[1.03]
          "
        >

        <div
          v-else
          class="
            flex size-full
            items-center justify-center
          "
        >
          <div
            class="
              flex size-20
              items-center justify-center
              rounded-full
              bg-brew-900
              text-brew-100
            "
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              class="size-10"
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
    </button>

    <!-- PRODUCT INFORMATION -->
    <div class="px-1 pb-1 pt-4">
      <div
        class="
          flex items-start
          justify-between
          gap-4
        "
      >
        <div class="min-w-0">
          <button
            type="button"
            class="
              text-left
              text-lg font-semibold
              tracking-tight
              text-brew-900
              transition
              hover:text-brew-700
            "
            :disabled="!enableQuickView"
            @click="openQuickView"
          >
            {{ product.name }}
          </button>

          <p
            class="
              mt-1
              text-sm
              text-brew-500
            "
          >
            {{ product.sku }}
          </p>
        </div>

        <p
          class="
            shrink-0
            font-semibold
            text-brew-700
          "
        >
          {{ formattedPrice }}
        </p>
      </div>

      <p
        v-if="product.description"
        class="
          mt-3
          line-clamp-2
          text-sm
          leading-6
          text-brew-500
        "
      >
        {{ product.description }}
      </p>

      <!-- ACTIONS -->
      <div
        class="
          mt-5
          flex
          gap-2
        "
      >
        <button
          type="button"
          class="
            flex-1
            rounded-2xl
            bg-brew-900
            px-4 py-3
            text-sm font-semibold
            text-white
            transition
            hover:bg-brew-800
            active:scale-[0.98]
          "
          @click="addToCart"
        >
          {{
            recentlyAdded
              ? 'Added ✓'
              : 'Add to cart'
          }}
        </button>

        <button
          v-if="enableQuickView"
          type="button"
          class="
            rounded-2xl
            border border-brew-200
            px-4 py-3
            text-sm font-semibold
            text-brew-800
            transition
            hover:bg-brew-50
          "
          @click="openQuickView"
        >
          View
        </button>
      </div>
    </div>

    <ProductQuickViewModal
      v-if="showQuickView"
      :product="product"
      :image-url="imageUrl"
      @close="closeQuickView"
      @add-to-cart="addFromQuickView"
    />
  </article>
</template>