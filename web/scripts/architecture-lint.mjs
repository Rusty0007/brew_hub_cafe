import {
  readFile,
  readdir,
} from 'node:fs/promises'

import {
  relative,
  resolve,
  sep,
} from 'node:path'

const projectRoot =
  resolve(process.cwd())

const domainsRoot =
  resolve(
    projectRoot,
    'server',
    'domains',
  )


const apiRoot =
  resolve(
    projectRoot,
    'server',
    'api',
  )

const drizzleSchemaPath =
  resolve(
    projectRoot,
    'drizzle',
    'schema.ts',
  )

/*
 * BrewHub business table ownership.
 *
 * A domain may directly mutate tables
 * that it owns.
 */
const tableOwners = {
  users:
    'authentication',

  roles:
    'authentication',

  userRoles:
    'authentication',

  userBranches:
    'authentication',

  customers:
    'customer',

  categories:
    'catalog',

  products:
    'catalog',

  orders:
    'ordering',

  orderItems:
    'ordering',

  payments:
    'payment',

  inventory:
    'inventory',

  inventoryReservations:
    'inventory',

  stockMovements:
    'inventory',

  idempotencyKeys:
    'idempotency',
}

/*
 * Shared tables have special rules
 * instead of normal single-domain
 * ownership.
 */
const sharedTables = {
  branches: {
    allowDirectWrites:
      false,
  },

  auditLogs: {
    allowInsert:
      true,

    allowUpdate:
      false,

    allowDelete:
      false,
  },
}

/*
 * Explicitly approved cross-domain
 * mutations.
 *
 * These are narrow exceptions rather
 * than general permission for one
 * domain to modify another domain's
 * data.
 */
const approvedCrossDomainWrites = [
  {
    domain:
      'customer',

    file:
      'server/domains/customer/repository.ts',

    operation:
      'insert',

    table:
      'users',

    reason:
      'Atomic customer registration creates the authentication identity and customer profile together.',
  },
]

/*
 * Approved cross-domain dependencies.
 *
 * Business domains may call another
 * domain only through explicitly
 * approved public modules.
 */
const approvedDomainDependencies = {
  authentication: {
    observability: [
      'service',
    ],
  },

  customer: {
    authentication: [
      'service',
    ],
  },

  inventory: {
    observability: [
      'service',
    ],
  },

  ordering: {
    catalog: [
      'service',
    ],

    customer: [
      'service',
    ],

    inventory: [
      'service',
    ],

    payment: [
      'service',
    ],

    observability: [
      'service',
      'performance',
    ],
  },
}

const protectedAtomicOperations = [
  {
    file:
      'server/domains/customer/repository.ts',

    functionName:
      'insertCustomerAccount',

    mechanismName:
      'db.transaction',

    mechanismPattern:
      /\bdb\.transaction\s*\(/,
  },

  {
    file:
      'server/domains/ordering/repository.ts',

    functionName:
      'completeOrder',

    mechanismName:
      'brewhub.sp_complete_order',

    mechanismPattern:
      /\bCALL\s+brewhub\.sp_complete_order\s*\(/i,
  },

  {
    file:
      'server/domains/ordering/repository.ts',

    functionName:
      'cancelOrder',

    mechanismName:
      'brewhub.sp_cancel_order',

    mechanismPattern:
      /\bCALL\s+brewhub\.sp_cancel_order\s*\(/i,
  },

  {
    file:
      'server/domains/ordering/repository.ts',

    functionName:
      'recoverExpiredPendingOrders',

    mechanismName:
      'brewhub.sp_recover_expired_pending_orders',

    mechanismPattern:
      /\bCALL\s+brewhub\.sp_recover_expired_pending_orders\s*\(/i,
  },

  {
    file:
      'server/domains/ordering/repository.ts',

    functionName:
      'insertOrderWithItems',

    mechanismName:
      'db.transaction',

    mechanismPattern:
      /\bdb\.transaction\s*\(/,
  },

  {
    file:
      'server/domains/payment/repository.ts',

    functionName:
      'insertRefundPaymentRecordWithAudit',

    mechanismName:
      'db.transaction',

    mechanismPattern:
      /\bdb\.transaction\s*\(/,
  },

  {
    file:
      'server/domains/inventory/repository.ts',

    functionName:
      'reserveStock',

    mechanismName:
      'brewhub.fn_reserve_stock',

    mechanismPattern:
      /\bbrewhub\.fn_reserve_stock\s*\(/i,
  },

  {
    file:
      'server/domains/inventory/repository.ts',

    functionName:
      'releaseReservation',

    mechanismName:
      'brewhub.fn_release_reservation',

    mechanismPattern:
      /\bbrewhub\.fn_release_reservation\s*\(/i,
  },

  {
    file:
      'server/domains/inventory/repository.ts',

    functionName:
      'receiveStock',

    mechanismName:
      'brewhub.fn_receive_stock',

    mechanismPattern:
      /\bbrewhub\.fn_receive_stock\s*\(/i,
  },

  {
    file:
      'server/domains/inventory/repository.ts',

    functionName:
      'adjustStock',

    mechanismName:
      'brewhub.fn_adjust_stock',

    mechanismPattern:
      /\bbrewhub\.fn_adjust_stock\s*\(/i,
  },

  {
    file:
      'server/domains/idempotency/repository.ts',

    functionName:
      'beginIdempotentRequest',

    mechanismName:
      'brewhub.fn_begin_idempotent_request',

    mechanismPattern:
      /\bbrewhub\.fn_begin_idempotent_request\s*\(/i,
  },

  {
    file:
      'server/domains/idempotency/repository.ts',

    functionName:
      'finishIdempotentRequest',

    mechanismName:
      'brewhub.sp_finish_idempotent_request',

    mechanismPattern:
      /\bCALL\s+brewhub\.sp_finish_idempotent_request\s*\(/i,
  },
]

/*
 * Mutation endpoints that are
 * intentionally callable without an
 * existing authenticated session.
 *
 * Adding a new public mutation route
 * requires an explicit architecture
 * policy decision here.
 */
const publicMutationEndpoints =
  new Set([
    'server/api/auth/login.post.ts',
    'server/api/auth/logout.post.ts',
    'server/api/auth/register.post.ts',
    'server/api/observability/client-performance.post.ts',
  ])

/*
 * Highly privileged development tools
 * may remain unauthenticated only when
 * they explicitly reject every
 * environment except development.
 */
const developmentOnlyMutationEndpoints =
  new Set([
    'server/api/dev/admin-reset-once.post.ts',
    'server/api/dev/bootstrap-manager.post.ts',
  ])

const criticalTraceEndpoints = [
  'server/api/staff/pos/orders/index.post.ts',

  'server/api/staff/pos/orders/[id]/prepare-payment.post.ts',

  'server/api/staff/pos/orders/[id]/complete-payment.post.ts',

  'server/api/pos/orders/[id]/complete-payment.post.ts',

  'server/api/staff/orders/[id]/cancel.post.ts',

  'server/api/manager/orders/[id]/refund.post.ts',

  'server/api/manager/inventory/adjust.post.ts',

  'server/api/manager/inventory/receive.post.ts',

  'server/api/customer/orders/index.post.ts',

  'server/api/customer/orders/[id]/cancel.post.ts',

  'server/api/customer/orders/[id]/prepare-payment.post.ts',

  'server/api/customer/orders/[id]/simulate-payment.post.ts',
]

const protectedTraceFunctions = [
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'prepareCustomerOrderForPayment',
  },
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'preparePosOrderForPayment',
  },
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'cancelCustomerOrder',
  },
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'cancelStaffOrder',
  },
  {
    file:
      'server/domains/ordering/checkout-service.ts',

    functionName:
      'completeCustomerCheckout',
  },
  {
    file:
      'server/domains/ordering/checkout-service.ts',

    functionName:
      'completePosCheckout',
  },
]

const structuredOperationalLoggingRequirements = [
  {
    file:
      'server/domains/payment/service.ts',

    functionName:
      'refundOrderPayment',
  },
  {
    file:
      'server/domains/inventory/service.ts',

    functionName:
      'receiveInventoryStock',
  },
  {
    file:
      'server/domains/inventory/service.ts',

    functionName:
      'adjustInventoryStock',
  },
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'cancelCustomerOrder',
  },
  {
    file:
      'server/domains/ordering/service.ts',

    functionName:
      'cancelStaffOrder',
  },
  {
    file:
      'server/domains/ordering/checkout-service.ts',

    functionName:
      'simulatePosPaymentTimeout',
  },
  {
    file:
      'server/domains/ordering/checkout-service.ts',

    functionName:
      'completePosCheckout',
  },
  {
    file:
      'server/api/customer/orders/[id]/simulate-payment.post.ts',
  },
  {
    file:
      'server/api/staff/pos/orders/[id]/complete-payment.post.ts',
  },
  {
    file:
      'server/api/pos/orders/[id]/complete-payment.post.ts',
  },
  {
    file:
      'server/api/customer/orders/index.post.ts',
  },
  {
    file:
      'server/api/staff/pos/orders/index.post.ts',
  },
]

const criticalIdempotencyRequirements = [
  {
    file:
      'server/api/customer/orders/[id]/simulate-payment.post.ts',

    operationName:
      'Customer payment request',

    checks: [
      {
        name:
          'Idempotency-Key header',

        pattern:
          /getHeader\s*\(\s*event\s*,\s*['"]idempotency-key['"]/,

        minimumMatches:
          1,
      },
      {
        name:
          'beginIdempotentOperation',

        pattern:
          /\bbeginIdempotentOperation\s*\(/,

        minimumMatches:
          1,
      },
      {
        name:
          'finishIdempotentOperation',

        pattern:
          /\bfinishIdempotentOperation\s*\(/,

        minimumMatches:
          2,
      },
    ],
  },

  {
    file:
      'server/domains/ordering/checkout-service.ts',

    functionName:
      'completePosCheckout',

    operationName:
      'POS checkout',

    checks: [
      {
        name:
          'payment recording',

        pattern:
          /\brecordPaymentResult\s*\(/,

        minimumMatches:
          1,
      },
      {
        name:
          'provider reference propagation',

        pattern:
          /providerReference\s*:\s*input\.providerReference/,

        minimumMatches:
          1,
      },
    ],
  },

  {
    file:
      'server/domains/payment/service.ts',

    functionName:
      'recordPaymentResult',

    operationName:
      'Payment result recording',

    checks: [
      {
        name:
          'provider reference duplicate lookup',

        pattern:
          /\bfindPaymentByProviderReference\s*\(/,

        minimumMatches:
          2,
      },
    ],
  },

  {
    file:
      'server/domains/payment/service.ts',

    functionName:
      'refundOrderPayment',

    operationName:
      'Payment refund',

    checks: [
      {
        name:
          'stable refund provider reference',

        pattern:
          /`FULL-REFUND-PAYMENT-\$\{originalPayment\.id\}`/,

        minimumMatches:
          1,
      },
      {
        name:
          'refund provider-reference lookup',

        pattern:
          /\bfindPaymentByProviderReference\s*\(/,

        minimumMatches:
          2,
      },
    ],
  },
]

function normalizePath(
  value,
) {
  return value
    .split(sep)
    .join('/')
}

function getRelativePath(
  filePath,
) {
  return normalizePath(
    relative(
      projectRoot,
      filePath,
    ),
  )
}

function getDomainFromPath(
  filePath,
) {
  const relativePath =
    getRelativePath(
      filePath,
    )

  const match =
    relativePath.match(
      /^server\/domains\/([^/]+)\//,
    )

  return match?.[1] ?? null
}

async function findTypeScriptFiles(
  directory,
) {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes:
          true,
      },
    )

  const files = []

  for (
    const entry of entries
  ) {
    const entryPath =
      resolve(
        directory,
        entry.name,
      )

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...await findTypeScriptFiles(
          entryPath,
        ),
      )

      continue
    }

    if (
      entry.isFile()
      && entry.name.endsWith(
        '.ts',
      )
    ) {
      files.push(
        entryPath,
      )
    }
  }

  return files
}

function getLineNumber(
  source,
  index,
) {
  return source
    .slice(
      0,
      index,
    )
    .split('\n')
    .length
}

function isApprovedCrossDomainWrite(
  {
    domain,
    file,
    operation,
    table,
  },
) {
  return approvedCrossDomainWrites
    .some(
      exception =>
        exception.domain
          === domain
        && exception.file
          === file
        && exception.operation
          === operation
        && exception.table
          === table,
    )
}

function checkSharedTableMutation(
  {
    operation,
    table,
  },
) {
  if (
    table === 'branches'
  ) {
    return {
      allowed:
        sharedTables
          .branches
          .allowDirectWrites,
    }
  }

  if (
    table === 'auditLogs'
  ) {
    if (
      operation === 'insert'
    ) {
      return {
        allowed:
          sharedTables
            .auditLogs
            .allowInsert,
      }
    }

    if (
      operation === 'update'
    ) {
      return {
        allowed:
          sharedTables
            .auditLogs
            .allowUpdate,
      }
    }

    if (
      operation === 'delete'
    ) {
      return {
        allowed:
          sharedTables
            .auditLogs
            .allowDelete,
      }
    }
  }

  return null
}

async function checkDomainTableOwnership() {
  const findings = []

  const files =
    await findTypeScriptFiles(
      domainsRoot,
    )

  /*
   * Detect Drizzle mutations such as:
   *
   * db.insert(users)
   * tx.update(products)
   * db.delete(orders)
   *
   * This deliberately requires a table
   * argument so createHash().update()
   * is not mistaken for a database
   * mutation.
   */
  const mutationPattern =
    /\.(insert|update|delete)\s*\(\s*([A-Za-z_$][\w$]*)/g

  for (
    const filePath of files
  ) {
    const source =
      await readFile(
        filePath,
        'utf8',
      )

    const domain =
      getDomainFromPath(
        filePath,
      )

    if (!domain) {
      continue
    }

    const relativePath =
      getRelativePath(
        filePath,
      )

    for (
      const match of source.matchAll(
        mutationPattern,
      )
    ) {
      const operation =
        match[1]

      const table =
        match[2]

      if (
        !operation
        || !table
      ) {
        continue
      }

      /*
       * Shared infrastructure tables
       * follow their own mutation rules.
       */
      const sharedDecision =
        checkSharedTableMutation({
          operation,
          table,
        })

      if (
        sharedDecision
      ) {
        if (
          !sharedDecision.allowed
        ) {
          findings.push({
            file:
              relativePath,

            line:
              getLineNumber(
                source,
                match.index ?? 0,
              ),

            message:
              `${domain} may not ${operation} shared table "${table}".`,
          })
        }

        continue
      }

      const owner =
        tableOwners[
          table
        ]

      /*
       * Ignore identifiers that are not
       * tables known to the architecture
       * ownership map.
       *
       * Other Task 14 rules will inspect
       * raw SQL and database routines.
       */
      if (!owner) {
        continue
      }

      if (
        owner === domain
      ) {
        continue
      }

      if (
        isApprovedCrossDomainWrite({
          domain,
          file:
            relativePath,
          operation,
          table,
        })
      ) {
        continue
      }

      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index ?? 0,
          ),

        message:
          `${domain} may not directly ${operation} ${owner}-owned table "${table}".`,
      })
    }
  }

  return findings
}

async function checkControlledCrossDomainDependencies() {
  const findings = []

  const files =
    await findTypeScriptFiles(
      domainsRoot,
    )

  /*
   * Match static imports such as:
   *
   * from '#server/domains/inventory/service'
   */
  const aliasImportPattern =
    /from\s+['"]#server\/domains\/([^/'"]+)\/([^'"]+)['"]/g

  /*
   * Match relative imports that move
   * upward from a domain.
   *
   * Existing same-domain imports such
   * as "./repository" are not affected.
   */
  const relativeParentImportPattern =
    /from\s+['"](\.\.\/[^'"]+)['"]/g

  for (
    const filePath of files
  ) {
    const source =
      await readFile(
        filePath,
        'utf8',
      )

    const sourceDomain =
      getDomainFromPath(
        filePath,
      )

    if (!sourceDomain) {
      continue
    }

    const relativePath =
      getRelativePath(
        filePath,
      )

    for (
      const match of source.matchAll(
        aliasImportPattern,
      )
    ) {
      const targetDomain =
        match[1]

      const targetModulePath =
        match[2]

      if (
        !targetDomain
        || !targetModulePath
      ) {
        continue
      }

      /*
       * A domain may freely use its own
       * internal modules.
       */
      if (
        targetDomain
          === sourceDomain
      ) {
        continue
      }

      /*
       * Only the first module segment
       * defines the approved public
       * boundary.
       *
       * Example:
       * observability/performance
       */
      const targetModule =
        targetModulePath
          .split('/')[0]

      const allowedModules =
        approvedDomainDependencies[
          sourceDomain
        ]?.[
          targetDomain
        ]

      if (
        allowedModules
          ?.includes(
            targetModule,
          )
      ) {
        continue
      }

      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index ?? 0,
          ),

        message:
          `${sourceDomain} may not depend on ${targetDomain}/${targetModulePath}. Use an approved public domain interface.`,
      })
    }

    /*
     * Cross-domain relative paths are
     * forbidden because they bypass the
     * declared dependency map.
     *
     * Example:
     * ../inventory/repository
     */
    for (
      const match of source.matchAll(
        relativeParentImportPattern,
      )
    ) {
      const importPath =
        match[1]

      if (!importPath) {
        continue
      }

      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index ?? 0,
          ),

        message:
          `${sourceDomain} may not use parent-relative domain import "${importPath}". Use the #server/domains alias and an approved public interface.`,
      })
    }
  }

  return findings
}

async function checkReportingReadOnly() {
  const findings = []

  const reportingRoot =
    resolve(
      domainsRoot,
      'reporting',
    )

  const files =
    await findTypeScriptFiles(
      reportingRoot,
    )

  /*
   * Reporting is strictly read-only.
   *
   * Any direct mutation-style call
   * inside the Reporting domain is
   * considered an architecture
   * violation.
   */
  const directMutationPattern =
    /\.(insert|update|delete)\s*\(/g

  /*
   * Also inspect tagged SQL templates.
   *
   * This prevents Reporting from
   * bypassing the Drizzle read-only
   * boundary through raw SQL.
   */
  const sqlTemplatePattern =
    /sql\s*`([\s\S]*?)`/g

  const mutatingSqlPattern =
    /\b(INSERT|UPDATE|DELETE|TRUNCATE|MERGE|CALL|CREATE|ALTER|DROP)\b/i

  for (
    const filePath of files
  ) {
    const source =
      await readFile(
        filePath,
        'utf8',
      )

    const relativePath =
      getRelativePath(
        filePath,
      )

    for (
      const match of source.matchAll(
        directMutationPattern,
      )
    ) {
      const operation =
        match[1]

      if (!operation) {
        continue
      }

      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index ?? 0,
          ),

        message:
          `Reporting is read-only and may not perform "${operation}" mutations.`,
      })
    }

    for (
      const match of source.matchAll(
        sqlTemplatePattern,
      )
    ) {
      const sqlBody =
        match[1]

      if (!sqlBody) {
        continue
      }

      const mutation =
        sqlBody.match(
          mutatingSqlPattern,
        )

      if (!mutation) {
        continue
      }

      const operation =
        mutation[1]
          ?.toUpperCase()
        ?? 'UNKNOWN'

      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index ?? 0,
          ),

        message:
          `Reporting is read-only and may not execute mutating SQL operation "${operation}".`,
      })
    }
  }

  return findings
}

async function checkValidForeignKeyTargets() {
  const findings = []

  const source =
    await readFile(
      drizzleSchemaPath,
      'utf8',
    )

  /*
   * Split the generated Drizzle schema
   * into complete table blocks.
   *
   * Example:
   *
   * export const usersInBrewhub =
   *   brewhub.table(...)
   */
  const tableBlockPattern =
    /export const ([A-Za-z_$][\w$]*)\s*=\s*brewhub\.table\([\s\S]*?(?=\nexport const |\s*$)/g

  const tableBlocks =
    Array.from(
      source.matchAll(
        tableBlockPattern,
      ),
    )

  /*
   * Build the set of columns that are
   * valid single-column FK targets.
   */
  const validKeyColumns =
    new Set()

  for (
    const tableMatch of tableBlocks
  ) {
    const tableName =
      tableMatch[1]

    const tableBody =
      tableMatch[0]

    if (
      !tableName
      || !tableBody
    ) {
      continue
    }

    /*
     * Column-level primary key.
     *
     * Example:
     *
     * id: bigint(...)
     *   .primaryKey()
     *
     * Generated Drizzle column
     * declarations are kept on their
     * source line, so this deliberately
     * avoids scanning across unrelated
     * columns.
     */
    const primaryKeyPattern =
      /^\s*([A-Za-z_$][\w$]*)\s*:\s*[^\n]*\.primaryKey\(\)/gm

    for (
      const keyMatch of tableBody.matchAll(
        primaryKeyPattern,
      )
    ) {
      const columnName =
        keyMatch[1]

      if (!columnName) {
        continue
      }

      validKeyColumns.add(
        `${tableName}.${columnName}`,
      )
    }

    /*
     * Single-column UNIQUE constraint.
     *
     * Example:
     *
     * unique("roles_code_key")
     *   .on(table.code)
     *
     * Composite unique constraints are
     * intentionally not treated as
     * making each individual column
     * unique.
     */
    const uniquePattern =
      /unique\([^)]*\)\s*\.on\(\s*table\.([A-Za-z_$][\w$]*)\s*\)/g

    for (
      const uniqueMatch of tableBody.matchAll(
        uniquePattern,
      )
    ) {
      const columnName =
        uniqueMatch[1]

      if (!columnName) {
        continue
      }

      validKeyColumns.add(
        `${tableName}.${columnName}`,
      )
    }
  }

  /*
   * Validate every current
   * single-column foreign-key target.
   *
   * Examples:
   *
   * [usersInBrewhub.id]
   *
   * Self-reference:
   * [table.id]
   */
  for (
    const tableMatch of tableBlocks
  ) {
    const currentTable =
      tableMatch[1]

    const tableBody =
      tableMatch[0]

    if (
      !currentTable
      || !tableBody
    ) {
      continue
    }

    const foreignTargetPattern =
      /foreignColumns:\s*\[\s*([A-Za-z_$][\w$]*|table)\.([A-Za-z_$][\w$]*)\s*\]/g

    for (
      const foreignMatch of tableBody.matchAll(
        foreignTargetPattern,
      )
    ) {
      const rawTargetTable =
        foreignMatch[1]

      const targetColumn =
        foreignMatch[2]

      if (
        !rawTargetTable
        || !targetColumn
      ) {
        continue
      }

      const targetTable =
        rawTargetTable === 'table'
          ? currentTable
          : rawTargetTable

      const targetKey =
        `${targetTable}.${targetColumn}`

      if (
        validKeyColumns.has(
          targetKey,
        )
      ) {
        continue
      }

      findings.push({
        file:
          'drizzle/schema.ts',

        line:
          getLineNumber(
            source,
            (
              tableMatch.index
              ?? 0
            )
            + (
              foreignMatch.index
              ?? 0
            ),
          ),

        message:
          `Foreign key target "${targetKey}" is not declared as a primary-key or single-column unique key.`,
      })
    }
  }

  return findings
}

function getExportedAsyncFunctionBlock(
  source,
  functionName,
) {
  const functionPattern =
    new RegExp(
      `export\\s+async\\s+function\\s+${functionName}\\s*\\(`,
    )

  const match =
    functionPattern.exec(
      source,
    )

  if (!match) {
    return null
  }

  const start =
    match.index

  const afterStart =
    start
    + match[0].length

  const remainingSource =
    source.slice(
      afterStart,
    )

  const nextFunctionMatch =
    /\nexport\s+async\s+function\s+[A-Za-z_$][\w$]*\s*\(/
      .exec(
        remainingSource,
      )

  const end =
    nextFunctionMatch
      ? afterStart
        + nextFunctionMatch.index
      : source.length

  return {
    source:
      source.slice(
        start,
        end,
      ),

    index:
      start,
  }
}

async function checkSensitiveMutationAtomicity() {
  const findings = []

  for (
    const operation
    of protectedAtomicOperations
  ) {
    const filePath =
      resolve(
        projectRoot,
        operation.file,
      )

    const source =
      await readFile(
        filePath,
        'utf8',
      )

    const functionBlock =
      getExportedAsyncFunctionBlock(
        source,
        operation.functionName,
      )

    /*
     * If a protected operation was
     * renamed or removed, the policy
     * must be reviewed explicitly.
     */
    if (!functionBlock) {
      findings.push({
        file:
          operation.file,

        line:
          null,

        message:
          `Protected atomic operation "${operation.functionName}" was not found. Review the DB-002 policy.`,
      })

      continue
    }

    if (
      operation.mechanismPattern
        .test(
          functionBlock.source,
        )
    ) {
      continue
    }

    findings.push({
      file:
        operation.file,

      line:
        getLineNumber(
          source,
          functionBlock.index,
        ),

      message:
        `Sensitive operation "${operation.functionName}" must use atomic mechanism "${operation.mechanismName}".`,
    })
  }

  return findings
}

async function checkSensitiveEndpointAuthorization() {
  const findings = []

  const files =
    await findTypeScriptFiles(
      apiRoot,
    )

  const mutationEndpointPattern =
    /\.(post|patch|put|delete)\.ts$/i

  const authorizationPattern =
    /\b(requireUser|requireRole|requireAnyRole)\s*\(/

  const developmentOnlyPattern =
    /process\.env\.NODE_ENV\s*!==\s*['"]development['"]/

  for (
    const filePath of files
  ) {
    const relativePath =
      getRelativePath(
        filePath,
      )

    if (
      !mutationEndpointPattern.test(
        relativePath,
      )
    ) {
      continue
    }

    const source =
      await readFile(
        filePath,
        'utf8',
      )

    /*
     * Explicit public exceptions.
     */
    if (
      publicMutationEndpoints.has(
        relativePath,
      )
    ) {
      continue
    }

    /*
     * Development-only privileged tools.
     */
    if (
      developmentOnlyMutationEndpoints.has(
        relativePath,
      )
    ) {
      if (
        developmentOnlyPattern.test(
          source,
        )
      ) {
        continue
      }

      findings.push({
        file:
          relativePath,

        line:
          1,

        message:
          'Development-only mutation endpoint must explicitly reject every environment except development.',
      })

      continue
    }

    /*
     * Every other mutation endpoint
     * requires an approved server-side
     * authentication / authorization
     * guard.
     */
    const authorizationMatch =
      authorizationPattern.exec(
        source,
      )

    if (
      authorizationMatch
    ) {
      continue
    }

    findings.push({
      file:
        relativePath,

      line:
        1,

      message:
        'Sensitive mutation endpoint does not call an approved server-side authorization guard.',
    })
  }

  return findings
}

async function checkAdministrativeUserManagement() {
  const findings = []

  const adminUsersRoot =
    resolve(
      apiRoot,
      'admin',
      'users',
    )

  const files =
    await findTypeScriptFiles(
      adminUsersRoot,
    )

  /*
   * Administrative user-management
   * endpoints must require the ADMIN
   * role specifically.
   *
   * Authentication alone, MANAGER,
   * or a broader role list is not
   * sufficient for SEC-002.
   */
  const adminRolePattern =
    /\brequireRole\s*\(\s*event\s*,\s*['"]ADMIN['"]\s*,?\s*\)/

  for (
    const filePath of files
  ) {
    const source =
      await readFile(
        filePath,
        'utf8',
      )

    const relativePath =
      getRelativePath(
        filePath,
      )

    const adminRoleMatch =
      adminRolePattern.exec(
        source,
      )

    if (
      adminRoleMatch
    ) {
      continue
    }

    findings.push({
      file:
        relativePath,

      line:
        1,

      message:
        'Administrative user-management endpoint must require the ADMIN role.',
    })
  }

  return findings
}

async function checkTracePropagation() {
  const findings = []

  /*
   * The request-context middleware is
   * the approved origin of request
   * trace IDs.
   *
   * Downstream server code must
   * propagate that trace rather than
   * replacing it.
   */
  const approvedTraceOrigin =
    'server/middleware/request-context.ts'

  const serverFiles =
    await findTypeScriptFiles(
      resolve(
        projectRoot,
        'server',
      ),
    )

  const traceResetPattern =
    /\btraceId\s*(?::|=)\s*randomUUID\s*\(/g

  /*
   * Prevent downstream code from
   * replacing an existing trace with
   * a new UUID.
   */
  for (
    const filePath of serverFiles
  ) {
    const relativePath =
      getRelativePath(
        filePath,
      )

    if (
      relativePath
      === approvedTraceOrigin
    ) {
      continue
    }

    const source =
      await readFile(
        filePath,
        'utf8',
      )

    traceResetPattern.lastIndex = 0

    let match =
      traceResetPattern.exec(
        source,
      )

    while (match) {
      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index,
          ),

        message:
          'Downstream server code must propagate the request traceId instead of creating a new traceId with randomUUID().',
      })

      match =
        traceResetPattern.exec(
          source,
        )
    }
  }

  /*
   * Critical HTTP workflows must read
   * the BrewHub request context and
   * use its traceId.
   */
  const requestContextPattern =
    /\bgetBrewHubRequestContext\s*\(\s*event\s*,?\s*\)/

  const contextTracePattern =
    /\b[A-Za-z_$][\w$]*Context\.traceId\b/

  for (
    const relativePath
    of criticalTraceEndpoints
  ) {
    const filePath =
      resolve(
        projectRoot,
        ...relativePath.split('/'),
      )

    let source

    try {
      source =
        await readFile(
          filePath,
          'utf8',
        )
    }
    catch {
      findings.push({
        file:
          relativePath,

        line:
          1,

        message:
          'Critical trace-propagation endpoint is missing.',
      })

      continue
    }

    const requestContextMatch =
      requestContextPattern.exec(
        source,
      )

    if (!requestContextMatch) {
      findings.push({
        file:
          relativePath,

        line:
          1,

        message:
          'Critical workflow must read the BrewHub request context.',
      })

      continue
    }

    const traceMatch =
      contextTracePattern.exec(
        source,
      )

    if (!traceMatch) {
      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            requestContextMatch.index,
          ),

        message:
          'Critical workflow must propagate the traceId from the BrewHub request context.',
      })
    }
  }

  /*
   * Protected downstream workflows
   * must explicitly receive traceId.
   */
  const traceParameterPattern =
    /\btraceId\s*:\s*string\b/

  for (
    const operation
    of protectedTraceFunctions
  ) {
    const filePath =
      resolve(
        projectRoot,
        ...operation.file.split('/'),
      )

    let source

    try {
      source =
        await readFile(
          filePath,
          'utf8',
        )
    }
    catch {
      findings.push({
        file:
          operation.file,

        line:
          1,

        message:
          `Protected trace workflow ${operation.functionName} is missing.`,
      })

      continue
    }

    const functionBlock =
      getExportedAsyncFunctionBlock(
        source,
        operation.functionName,
      )

    if (!functionBlock) {
      findings.push({
        file:
          operation.file,

        line:
          1,

        message:
          `Protected trace workflow ${operation.functionName} was not found.`,
      })

      continue
    }

    const signatureEnd =
      functionBlock.source.indexOf(
        ') {',
      )

    const signatureSource =
      signatureEnd >= 0
        ? functionBlock.source.slice(
            0,
            signatureEnd + 1,
          )
        : functionBlock.source.slice(
            0,
            400,
          )

    if (
      traceParameterPattern.test(
        signatureSource,
      )
    ) {
      continue
    }

    findings.push({
      file:
        operation.file,

      line:
        getLineNumber(
          source,
          functionBlock.index,
        ),

      message:
        `Protected workflow ${operation.functionName} must receive traceId as a required string parameter.`,
    })
  }

  return findings
}

async function checkStructuredOperationalLogging() {
  const findings = []

  const approvedConsoleSink =
    'server/utils/logger.ts'

  const serverFiles =
    await findTypeScriptFiles(
      resolve(
        projectRoot,
        'server',
      ),
    )

  const directConsolePattern =
    /\bconsole\.(log|info|warn|error|debug)\s*\(/g

  /*
   * Server business code must use
   * BrewHub's structured logger.
   *
   * Only logger.ts itself is allowed
   * to write directly to console.
   */
  for (
    const filePath of serverFiles
  ) {
    const relativePath =
      getRelativePath(
        filePath,
      )

    if (
      relativePath
      === approvedConsoleSink
    ) {
      continue
    }

    const source =
      await readFile(
        filePath,
        'utf8',
      )

    directConsolePattern.lastIndex = 0

    let match =
      directConsolePattern.exec(
        source,
      )

    while (match) {
      findings.push({
        file:
          relativePath,

        line:
          getLineNumber(
            source,
            match.index,
          ),

        message:
          'Server business code must use BrewHub structured logging instead of direct console output.',
      })

      match =
        directConsolePattern.exec(
          source,
        )
    }
  }

  /*
   * Critical operations must contain
   * structured logging or telemetry.
   */
  const structuredLoggingPattern =
    /\b(logInfo|logWarn|logError|recordTelemetryEvent)\s*\(/

  for (
    const requirement
    of structuredOperationalLoggingRequirements
  ) {
    const filePath =
      resolve(
        projectRoot,
        ...requirement.file.split('/'),
      )

    let source

    try {
      source =
        await readFile(
          filePath,
          'utf8',
        )
    }
    catch {
      findings.push({
        file:
          requirement.file,

        line:
          1,

        message:
          'Protected operational logging target is missing.',
      })

      continue
    }

    let protectedSource =
      source

    let protectedIndex =
      0

    if (
      requirement.functionName
    ) {
      const functionBlock =
        getExportedAsyncFunctionBlock(
          source,
          requirement.functionName,
        )

      if (!functionBlock) {
        findings.push({
          file:
            requirement.file,

          line:
            1,

          message:
            `Protected operational workflow ${requirement.functionName} was not found.`,
        })

        continue
      }

      protectedSource =
        functionBlock.source

      protectedIndex =
        functionBlock.index
    }

    if (
      structuredLoggingPattern.test(
        protectedSource,
      )
    ) {
      continue
    }

    findings.push({
      file:
        requirement.file,

      line:
        getLineNumber(
          source,
          protectedIndex,
        ),

      message:
        requirement.functionName
          ? `Critical workflow ${requirement.functionName} must use BrewHub structured logging or telemetry.`
          : 'Critical endpoint must use BrewHub structured logging or telemetry.',
    })
  }

  return findings
}

async function checkCriticalOperationIdempotency() {
  const findings = []

  for (
    const requirement
    of criticalIdempotencyRequirements
  ) {
    const filePath =
      resolve(
        projectRoot,
        ...requirement.file.split('/'),
      )

    let source

    try {
      source =
        await readFile(
          filePath,
          'utf8',
        )
    }
    catch {
      findings.push({
        file:
          requirement.file,

        line:
          1,

        message:
          `Protected idempotency target for ${requirement.operationName} is missing.`,
      })

      continue
    }

    let protectedSource =
      source

    let protectedIndex =
      0

    /*
     * Some requirements protect an
     * individual service function.
     *
     * Others protect an entire API
     * endpoint file.
     */
    if (
      requirement.functionName
    ) {
      const functionBlock =
        getExportedAsyncFunctionBlock(
          source,
          requirement.functionName,
        )

      if (!functionBlock) {
        findings.push({
          file:
            requirement.file,

          line:
            1,

          message:
            `Protected idempotency workflow ${requirement.functionName} was not found.`,
        })

        continue
      }

      protectedSource =
        functionBlock.source

      protectedIndex =
        functionBlock.index
    }

    /*
     * Every protected operation may
     * require several pieces of its
     * approved idempotency mechanism.
     */
    for (
      const check
      of requirement.checks
    ) {
      const flags =
        check.pattern.flags.includes(
          'g',
        )
          ? check.pattern.flags
          : `${check.pattern.flags}g`

      const pattern =
        new RegExp(
          check.pattern.source,
          flags,
        )

      const matches =
        protectedSource.match(
          pattern,
        )

      const matchCount =
        matches?.length ?? 0

      if (
        matchCount
        >= check.minimumMatches
      ) {
        continue
      }

      findings.push({
        file:
          requirement.file,

        line:
          getLineNumber(
            source,
            protectedIndex,
          ),

        message:
          `${requirement.operationName} must preserve ${check.name} for idempotency. Expected at least ${check.minimumMatches}, found ${matchCount}.`,
      })
    }
  }

  return findings
}

const architectureRules = [
  {
    id:
      'ARCH-001',

    name:
      'Domain Table Ownership',

    check:
      checkDomainTableOwnership,
  },

  {
    id:
      'ARCH-002',

    name:
      'Controlled Cross-Domain Dependencies',

    check:
      checkControlledCrossDomainDependencies,
  },

  {
    id:
        'ARCH-003',

    name:
        'Reporting Read-Only',

    check:
        checkReportingReadOnly,
    },

    {
      id:
        'DB-001',

      name:
        'Valid Foreign-Key Targets',

      check:
        checkValidForeignKeyTargets,
    },

    {
      id:
        'DB-002',

      name:
        'Sensitive Mutation Atomicity',

      check:
        checkSensitiveMutationAtomicity,
    },

    {
      id:
        'SEC-001',

      name:
        'Sensitive Endpoint Authorization',

      check:
        checkSensitiveEndpointAuthorization,
    },

    {
      id:
        'SEC-002',

      name:
        'Administrative User Management',

      check:
        checkAdministrativeUserManagement,
    },

    {
    id:
      'OBS-001',

    name:
      'Trace Propagation',

    check:
      checkTracePropagation,
  },

    {
    id:
      'OBS-002',

    name:
      'Structured Operational Logging',

    check:
      checkStructuredOperationalLogging,
  },

    {
    id:
      'IDEMP-001',

    name:
      'Critical Operation Idempotency',

    check:
      checkCriticalOperationIdempotency,
  },
]

async function runArchitectureLint() {
  const violations = []

  console.log(
    'BrewHub Architecture Lint',
  )

  console.log(
    '==========================',
  )

  if (
    architectureRules.length === 0
  ) {
    console.log(
      '\nNo architecture rules registered yet.',
    )
  }

  for (
    const rule of architectureRules
  ) {
    const findings =
      await rule.check()

    if (
      findings.length === 0
    ) {
      console.log(
        `\nPASS ${rule.id} — ${rule.name}`,
      )

      continue
    }

    console.log(
      `\nFAIL ${rule.id} — ${rule.name}`,
    )

    for (
      const finding of findings
    ) {
      violations.push({
        ruleId:
          rule.id,

        ...finding,
      })

      console.log(
        `  ${finding.message}`,
      )

      if (
        finding.file
      ) {
        const location =
          finding.line
            ? `${finding.file}:${finding.line}`
            : finding.file

        console.log(
          `  File: ${location}`,
        )
      }
    }
  }

  console.log(
    '\n==========================',
  )

  console.log(
    `Rules registered: ${architectureRules.length}`,
  )

  console.log(
    `Violations: ${violations.length}`,
  )

  if (
    violations.length > 0
  ) {
    console.error(
      '\nArchitecture lint failed.',
    )

    process.exitCode = 1

    return
  }

  console.log(
    '\nArchitecture lint passed.',
  )
}

await runArchitectureLint()
