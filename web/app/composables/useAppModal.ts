export type AppModalVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'confirm'

export interface AppModalOptions {
  variant: AppModalVariant
  title: string
  message: string
  primaryLabel?: string
  secondaryLabel?: string
  dismissible?: boolean
  closeOnBackdrop?: boolean
}

export interface AppModalState {
  open: boolean
  variant: AppModalVariant
  title: string
  message: string
  primaryLabel: string
  secondaryLabel: string
  dismissible: boolean
  closeOnBackdrop: boolean
}

type AppModalContentOptions =
  Omit<
    AppModalOptions,
    'variant'
  >

let pendingConfirmResolver:
  | ((confirmed: boolean) => void)
  | null =
    null

function createDefaultModalState():
AppModalState {
  return {
    open: false,
    variant: 'info',
    title: '',
    message: '',
    primaryLabel: 'OK',
    secondaryLabel: '',
    dismissible: true,
    closeOnBackdrop: true,
  }
}

export function useAppModal() {
  const modal =
    useState<AppModalState>(
      'brewhub-app-modal',
      createDefaultModalState,
    )

  function resetModal() {
    modal.value =
      createDefaultModalState()
  }

  function resolvePendingConfirmation(
    confirmed: boolean,
  ) {
    const resolver =
      pendingConfirmResolver

    pendingConfirmResolver =
      null

    resolver?.(
      confirmed,
    )
  }

  function showModal(
    options: AppModalOptions,
  ) {
    if (pendingConfirmResolver) {
      resolvePendingConfirmation(
        false,
      )
    }

    const isConfirm =
      options.variant
      === 'confirm'

    modal.value = {
      open: true,

      variant:
        options.variant,

      title:
        options.title,

      message:
        options.message,

      primaryLabel:
        options.primaryLabel
        ?? (
          isConfirm
            ? 'Confirm'
            : 'OK'
        ),

      secondaryLabel:
        options.secondaryLabel
        ?? (
          isConfirm
            ? 'Cancel'
            : ''
        ),

      dismissible:
        options.dismissible
        ?? true,

      closeOnBackdrop:
        options.closeOnBackdrop
        ?? !isConfirm,
    }
  }

  function closeModal() {
    if (
      modal.value.variant
      === 'confirm'
    ) {
      resolvePendingConfirmation(
        false,
      )
    }

    resetModal()
  }

  function confirmModal() {
    resolvePendingConfirmation(
      true,
    )

    resetModal()
  }

  function cancelModal() {
    resolvePendingConfirmation(
      false,
    )

    resetModal()
  }

  function showSuccess(
    options:
      AppModalContentOptions,
  ) {
    showModal({
      ...options,
      variant: 'success',
    })
  }

  function showError(
    options:
      AppModalContentOptions,
  ) {
    showModal({
      ...options,
      variant: 'error',
    })
  }

  function showWarning(
    options:
      AppModalContentOptions,
  ) {
    showModal({
      ...options,
      variant: 'warning',
    })
  }

  function showInfo(
    options:
      AppModalContentOptions,
  ) {
    showModal({
      ...options,
      variant: 'info',
    })
  }

  function showConfirm(
    options:
      AppModalContentOptions,
  ) {
    showModal({
      ...options,
      variant: 'confirm',
    })

    return new Promise<boolean>(
      (resolve) => {
        pendingConfirmResolver =
          resolve
      },
    )
  }

  return {
    modal,

    showModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,

    closeModal,
    confirmModal,
    cancelModal,
  }
}