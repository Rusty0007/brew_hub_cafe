interface FreshDataHighlightOptions {
  veryFreshMs?: number
  freshMs?: number
}

export function useFreshDataHighlight(
  options: FreshDataHighlightOptions = {},
) {
  const veryFreshMs =
    options.veryFreshMs
    ?? 15 * 1000

  const freshMs =
    options.freshMs
    ?? 60 * 1000

  function getAgeMs(
    createdAt: string,
  ) {
    const createdAtMs =
      new Date(
        createdAt,
      ).getTime()

    if (
      Number.isNaN(
        createdAtMs,
      )
    ) {
      return null
    }

    const ageMs =
      Date.now()
      - createdAtMs

    if (ageMs < 0) {
      return null
    }

    return ageMs
  }

  function isVeryFresh(
    createdAt: string,
  ) {
    const ageMs =
      getAgeMs(
        createdAt,
      )

    return (
      ageMs !== null
      && ageMs <= veryFreshMs
    )
  }

  function isFresh(
    createdAt: string,
  ) {
    const ageMs =
      getAgeMs(
        createdAt,
      )

    return (
      ageMs !== null
      && ageMs <= freshMs
    )
  }

  function getFreshnessClass(
    createdAt: string,
  ) {
    const ageMs =
      getAgeMs(
        createdAt,
      )

    if (ageMs === null) {
      return [
        'hover:bg-brew-50/60',
      ]
    }

    if (
      ageMs <= veryFreshMs
    ) {
      return [
        'bg-amber-100/80',
        'hover:bg-amber-100',
      ]
    }

    if (
      ageMs <= freshMs
    ) {
      return [
        'bg-brew-50',
        'hover:bg-brew-100/70',
      ]
    }

    return [
      'hover:bg-brew-50/60',
    ]
  }

  return {
    isVeryFresh,
    isFresh,
    getFreshnessClass,
  }
}