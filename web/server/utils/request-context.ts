import type {
  H3Event,
} from 'h3'

export interface BrewHubRequestContext {
  requestId: string
  traceId: string
  startedAtMs: number

  /*
   * These are populated later when
   * the request reaches a workflow
   * that knows these values.
   */
  userId: number | null
  branchId: number | null
  orderId: number | null
}

const CONTEXT_KEY =
  'brewHubRequestContext'

export function setBrewHubRequestContext(
  event: H3Event,
  context: BrewHubRequestContext,
) {
  event.context[
    CONTEXT_KEY
  ] = context
}

export function getBrewHubRequestContext(
  event: H3Event,
): BrewHubRequestContext {
  const context =
    event.context[
      CONTEXT_KEY
    ] as
      | BrewHubRequestContext
      | undefined

  if (!context) {
    throw new Error(
      'BrewHub request context is unavailable',
    )
  }

  return context
}

export function updateBrewHubRequestContext(
  event: H3Event,
  update: Partial<
    Pick<
      BrewHubRequestContext,
      | 'userId'
      | 'branchId'
      | 'orderId'
    >
  >,
) {
  const context =
    getBrewHubRequestContext(
      event,
    )

  Object.assign(
    context,
    update,
  )
}