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

    <div class="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full px-5 py-2.5 text-sm font-medium transition"
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
        class="rounded-full px-5 py-2.5 text-sm font-medium transition"
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