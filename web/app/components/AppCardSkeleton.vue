<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 6,
  },
)
</script>

<template>
  <div
    class="
      grid
      gap-4
      sm:grid-cols-2
      xl:grid-cols-3
    "
    aria-hidden="true"
  >
    <article
      v-for="item in count"
      :key="item"
      class="
        rounded-3xl
        border
        border-stone-200
        bg-white
        p-5
        shadow-sm
      "
    >
      <AppSkeleton
        class="
          h-40
          w-full
          rounded-2xl
        "
      />

      <div class="mt-5">
        <AppSkeleton
          class="h-3 w-20"
        />

        <AppSkeleton
          class="
            mt-3
            h-5
            w-3/4
          "
        />

        <AppSkeleton
          class="
            mt-2
            h-4
            w-1/2
          "
        />

        <div
          class="
            mt-6
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <AppSkeleton
            class="h-6 w-20"
          />

          <AppSkeleton
            class="
              h-10
              w-28
              rounded-xl
            "
          />
        </div>
      </div>
    </article>
  </div>
</template>