<script setup lang="ts">
interface Category {
  id: number
  name: string
}

defineProps<{
  categories: Category[]
  selectedCategoryId: number | null
}>()

const emit = defineEmits<{
  select: [categoryId: number | null]
}>()
</script>

<template>
  <div>
    <p
      class="text-xs font-semibold uppercase tracking-[0.18em] text-brew-500"
    >
      Categories
    </p>

    <div
      class="
        -mx-1
        mt-4
        flex
        flex-nowrap
        gap-2
        overflow-x-auto
        px-1
        pb-2

        sm:mx-0
        sm:mt-5
        sm:flex-wrap
        sm:overflow-visible
        sm:px-0
        sm:pb-0
      "
    >
      <button
        type="button"
        class="
        shrink-0
        rounded-full
        px-4
        py-2
        text-sm
        font-medium
        transition
        sm:px-5
        sm:py-2.5
      "
        :class="
          selectedCategoryId === null
            ? 'bg-brew-900 text-white shadow-sm'
            : 'border border-brew-200 bg-white text-brew-600 hover:border-brew-400 hover:text-brew-900'
        "
        @click="emit('select', null)"
      >
        All
      </button>

      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="
        shrink-0
        rounded-full
        px-4
        py-2
        text-sm
        font-medium
        transition
        sm:px-5
        sm:py-2.5
      "
        :class="
          selectedCategoryId === category.id
            ? 'bg-brew-900 text-white shadow-sm'
            : 'border border-brew-200 bg-white text-brew-600 hover:border-brew-400 hover:text-brew-900'
        "
        @click="emit('select', category.id)"
      >
        {{ category.name }}
      </button>
    </div>
  </div>
</template>