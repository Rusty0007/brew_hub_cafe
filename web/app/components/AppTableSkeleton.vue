<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    columns?: number
  }>(),
  {
    rows: 6,
    columns: 5,
  },
)
</script>

<template>
  <div
    class="
      overflow-hidden
      rounded-2xl
      border
      border-stone-200
      bg-white
    "
    aria-hidden="true"
  >
    <div
      class="
        grid
        gap-4
        border-b
        border-stone-200
        bg-stone-50
        px-5
        py-4
      "
      :style="{
        gridTemplateColumns:
          `repeat(${columns}, minmax(0, 1fr))`,
      }"
    >
      <AppSkeleton
        v-for="column in columns"
        :key="`header-${column}`"
        class="h-4 w-24"
      />
    </div>

    <div
      v-for="row in rows"
      :key="`row-${row}`"
      class="
        grid
        gap-4
        border-b
        border-stone-100
        px-5
        py-4
        last:border-b-0
      "
      :style="{
        gridTemplateColumns:
          `repeat(${columns}, minmax(0, 1fr))`,
      }"
    >
      <AppSkeleton
        v-for="column in columns"
        :key="`cell-${row}-${column}`"
        class="h-4 w-full"
      />
    </div>
  </div>
</template>