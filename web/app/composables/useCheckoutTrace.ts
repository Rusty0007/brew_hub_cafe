const TRACE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getStorageKey(
  orderId: number,
) {
  return `brewhub.checkout.trace.${orderId}`
}

export function useCheckoutTrace() {
  function createTraceId() {
    return crypto.randomUUID()
  }

  function saveTraceId(
    orderId: number,
    traceId: string,
  ) {
    if (!import.meta.client) {
      return
    }

    if (
      !Number.isInteger(orderId)
      || orderId <= 0
      || !TRACE_ID_PATTERN.test(traceId)
    ) {
      return
    }

    sessionStorage.setItem(
      getStorageKey(orderId),
      traceId,
    )
  }

  function getTraceId(
    orderId: number,
  ) {
    if (!import.meta.client) {
      return null
    }

    if (
      !Number.isInteger(orderId)
      || orderId <= 0
    ) {
      return null
    }

    const traceId =
      sessionStorage.getItem(
        getStorageKey(orderId),
      )

    if (
      !traceId
      || !TRACE_ID_PATTERN.test(traceId)
    ) {
      return null
    }

    return traceId
  }

  function getOrCreateTraceId(
    orderId: number,
  ) {
    const existingTraceId =
      getTraceId(orderId)

    if (existingTraceId) {
      return existingTraceId
    }

    const traceId =
      createTraceId()

    saveTraceId(
      orderId,
      traceId,
    )

    return traceId
  }

  return {
    createTraceId,
    saveTraceId,
    getTraceId,
    getOrCreateTraceId,
  }
}