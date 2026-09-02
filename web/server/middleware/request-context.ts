import {
  insertRequestLog,
} from '#server/domains/observability/repository'

import {
  randomUUID,
} from 'node:crypto'

import {
  getHeader,
  getMethod,
  getRequestURL,
  setResponseHeader,
} from 'h3'

import {
    logError,
    logInfo,
} from '#server/utils/logger'

import {
  getBrewHubRequestContext,
  setBrewHubRequestContext,
} from '#server/utils/request-context'

const TRACE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(
  (event) => {
      const requestId =
        randomUUID()
        
      const incomingTraceId =
        getHeader(
          event,
          'x-trace-id',
        )?.trim()
      
      const traceId =
        incomingTraceId
        && TRACE_ID_PATTERN.test(
          incomingTraceId,
        )
          ? incomingTraceId
          : randomUUID()
      
        const startedAtMs =
      Date.now()

    const method =
      getMethod(
        event,
      )

    const url =
      getRequestURL(
        event,
      )

    setBrewHubRequestContext(
      event,
      {
        requestId,
        traceId,
        startedAtMs,

        userId:
          null,

        branchId:
          null,

        orderId:
          null,
      },
    )

    setResponseHeader(
      event,
      'X-Request-Id',
      requestId,
    )

    setResponseHeader(
      event,
      'X-Trace-Id',
      traceId,
    )

    /*
     * Keep request logging focused on
     * BrewHub APIs so development output
     * is not flooded by page/assets.
     */
    if (
      !url.pathname.startsWith(
        '/api/',
      )
    ) {
      return
    }

    logInfo(
      'http.request.started',
      {
        requestId,
        traceId,

        method,
        path:
          url.pathname,
      },
    )

    /*
     * Log again after Node finishes
     * sending the HTTP response.
     */
    event.node.res.once(
      'finish',
      () => {
        const context =
          getBrewHubRequestContext(
            event,
          )
      
        const completedAt =
          new Date()
      
        const durationMs =
          completedAt.getTime()
          - context.startedAtMs
      
        const statusCode =
          event.node.res.statusCode
      
        logInfo(
          'http.request.completed',
          {
            requestId:
              context.requestId,
        
            traceId:
              context.traceId,
        
            userId:
              context.userId,
        
            branchId:
              context.branchId,
        
            orderId:
              context.orderId,
        
            method,
        
            path:
              url.pathname,
        
            statusCode,
        
            durationMs,
          },
        )
    
        /*
         * Persist observability data after
         * the HTTP response is completed.
         *
         * Logging must never cause the
         * original request to fail.
         */
        void insertRequestLog({
          requestId:
            context.requestId,
        
          traceId:
            context.traceId,
        
          userId:
            context.userId,
        
          branchId:
            context.branchId,
        
          orderId:
            context.orderId,
        
          method,
        
          path:
            url.pathname,
        
          statusCode,
        
          durationMs,
        
          startedAt:
            new Date(
              context.startedAtMs,
            ),
        
          completedAt,
        }).catch(
          (error) => {
            logError(
              'observability.request_log.persist_failed',
              {
                requestId:
                  context.requestId,
            
                traceId:
                  context.traceId,
            
                message:
                  error instanceof Error
                    ? error.message
                    : String(error),
              },
            )
          },
        )
      },
    )
  },
)