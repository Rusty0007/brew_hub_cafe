<script setup lang="ts">
const {
  modal,
  closeModal,
  confirmModal,
  cancelModal,
} = useAppModal()

const dialogRef =
  ref<HTMLElement | null>(
    null,
  )

const previousActiveElement =
  shallowRef<HTMLElement | null>(
    null,
  )

const isConfirmModal =
  computed(
    () =>
      modal.value.variant
      === 'confirm',
  )

const iconClasses =
  computed(() => {
    switch (
      modal.value.variant
    ) {
      case 'success':
        return [
          'bg-emerald-50',
          'text-emerald-700',
        ]

      case 'error':
        return [
          'bg-red-50',
          'text-red-700',
        ]

      case 'warning':
        return [
          'bg-amber-50',
          'text-amber-700',
        ]

      case 'confirm':
        return [
          'bg-brew-100',
          'text-brew-900',
        ]

      default:
        return [
          'bg-sky-50',
          'text-sky-700',
        ]
    }
  })

function handlePrimaryAction() {
  if (isConfirmModal.value) {
    confirmModal()

    return
  }

  closeModal()
}

function handleBackdropClick(
  event: MouseEvent,
) {
  if (
    event.target
    !== event.currentTarget
  ) {
    return
  }

  if (
    !modal.value.dismissible
    || !modal.value
      .closeOnBackdrop
  ) {
    return
  }

  cancelModal()
}

function handleEscape() {
  if (
    !modal.value.dismissible
  ) {
    return
  }

  cancelModal()
}

watch(
  () =>
    modal.value.open,

  async (isOpen) => {
    if (import.meta.server) {
      return
    }

    if (isOpen) {
      previousActiveElement.value =
        document.activeElement
        instanceof HTMLElement
          ? document.activeElement
          : null

      document.body.style.overflow =
        'hidden'

      await nextTick()

      dialogRef.value?.focus()

      return
    }

    document.body.style.overflow =
      ''

    previousActiveElement
      .value
      ?.focus()

    previousActiveElement.value =
      null
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow =
      ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modal.open"
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]"
        @click="handleBackdropClick"
        @keydown.esc="handleEscape"
      >
        <section
          ref="dialogRef"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-modal-title"
          aria-describedby="app-modal-message"
          class="relative w-full max-w-md rounded-4xl border border-brew-200 bg-white p-6 shadow-[0_30px_100px_rgba(45,25,15,0.25)] outline-none sm:p-8"
        >
          <button
            v-if="modal.dismissible"
            type="button"
            aria-label="Close dialog"
            class="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full text-brew-500 transition hover:bg-brew-50 hover:text-brew-900"
            @click="cancelModal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-5"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>

          <div
            class="mx-auto flex size-16 items-center justify-center rounded-full"
            :class="iconClasses"
          >
            <!-- Success -->
            <svg
              v-if="modal.variant === 'success'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />
              <path
                d="m8 12 2.5 2.5L16 9"
              />
            </svg>

            <!-- Error -->
            <svg
              v-else-if="modal.variant === 'error'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />
              <path
                d="m9 9 6 6M15 9l-6 6"
              />
            </svg>

            <!-- Warning -->
            <svg
              v-else-if="modal.variant === 'warning'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-8"
              aria-hidden="true"
            >
              <path
                d="M12 3 2.8 19h18.4L12 3Z"
              />
              <path
                d="M12 9v4"
              />
              <path
                d="M12 16h.01"
              />
            </svg>

            <!-- Confirmation -->
            <svg
              v-else-if="modal.variant === 'confirm'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />
              <path
                d="M9.8 9a2.4 2.4 0 0 1 4.6 1c0 1.7-2.4 2-2.4 3.5"
              />
              <path
                d="M12 17h.01"
              />
            </svg>

            <!-- Information -->
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />
              <path
                d="M12 11v5"
              />
              <path
                d="M12 8h.01"
              />
            </svg>
          </div>

          <div
            class="mt-6 text-center"
          >
            <h2
              id="app-modal-title"
              class="text-2xl font-semibold tracking-tight text-brew-950"
            >
              {{ modal.title }}
            </h2>

            <p
              id="app-modal-message"
              class="mt-3 whitespace-pre-line leading-7 text-brew-500"
            >
              {{ modal.message }}
            </p>
          </div>

          <div
            class="mt-8 flex flex-col-reverse gap-3 sm:flex-row"
            :class="
              isConfirmModal
                ? 'sm:justify-end'
                : 'sm:justify-center'
            "
          >
            <button
              v-if="isConfirmModal"
              type="button"
              class="rounded-full border border-brew-200 px-5 py-3 font-semibold text-brew-800 transition hover:bg-brew-50"
              @click="cancelModal"
            >
              {{ modal.secondaryLabel }}
            </button>

            <button
              type="button"
              class="rounded-full bg-brew-900 px-6 py-3 font-semibold text-white transition hover:bg-brew-700"
              @click="handlePrimaryAction"
            >
              {{ modal.primaryLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>