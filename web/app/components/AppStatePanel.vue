<script setup lang="ts">
type StateVariant =
  | 'empty'
  | 'error'
  | 'info'

const props =
  withDefaults(
    defineProps<{
      variant?: StateVariant
      title: string
      message?: string
    }>(),
    {
      variant: 'empty',
      message: '',
    },
  )

const panelClasses =
  computed(() => {
    switch (props.variant) {
      case 'error':
        return [
          'border-red-200',
          'bg-red-50',
        ]

      case 'info':
        return [
          'border-blue-200',
          'bg-blue-50',
        ]

      default:
        return [
          'border-stone-200',
          'bg-white',
        ]
    }
  })

const titleClasses =
  computed(() => {
    switch (props.variant) {
      case 'error':
        return 'text-red-800'

      case 'info':
        return 'text-blue-800'

      default:
        return 'text-stone-900'
    }
  })

const messageClasses =
  computed(() => {
    switch (props.variant) {
      case 'error':
        return 'text-red-700'

      case 'info':
        return 'text-blue-700'

      default:
        return 'text-stone-600'
    }
  })

const stateRole =
  computed(() =>
    props.variant === 'error'
      ? 'alert'
      : 'status',
  )
</script>

<template>
  <div
    :role="stateRole"
    :class="[
      'rounded-3xl',
      'border',
      'p-6',
      'text-center',
      'sm:p-8',
      ...panelClasses,
    ]"
  >
    <h2
      :class="[
        'text-lg',
        'font-semibold',
        titleClasses,
      ]"
    >
      {{ title }}
    </h2>

    <p
      v-if="message"
      :class="[
        'mx-auto',
        'mt-2',
        'max-w-xl',
        'text-sm',
        'leading-6',
        messageClasses,
      ]"
    >
      {{ message }}
    </p>

    <div
      v-if="$slots.default"
      class="
        mt-5
        flex
        flex-wrap
        justify-center
        gap-3
      "
    >
      <slot />
    </div>
  </div>
</template>