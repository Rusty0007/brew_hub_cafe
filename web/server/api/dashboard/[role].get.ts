import { requireAnyRole } from '#server/domains/authentication/authorization'
import { requireUser } from '#server/domains/authentication/session'
import { findCustomerByUserId } from '#server/domains/customer/repository'
import { getDashboardSummary } from '#server/domains/reporting/dashboard-service'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const role = getRouterParam(event, 'role')
  if (role !== 'admin' && role !== 'manager' && role !== 'cashier' && role !== 'customer') {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }
  const rawDays = getQuery(event).days ?? '7'
  if (rawDays !== '7' && rawDays !== '30') throw createError({ statusCode: 400, statusMessage: 'Choose a 7 or 30 day period' })
  const days = Number(rawDays)
  if (role === 'customer') {
    const user = await requireUser(event)
    if (user.roles.length) throw createError({ statusCode: 403, statusMessage: 'Customer access required' })
    const customer = await findCustomerByUserId(user.id)
    if (!customer?.isActive) throw createError({ statusCode: 403, statusMessage: 'Active customer profile required' })
    return getDashboardSummary(role, user.id, days, customer.id)
  }
  const requiredRole = role === 'admin' ? 'ADMIN' : role === 'manager' ? 'MANAGER' : 'CASHIER'
  const user = await requireAnyRole(event, [requiredRole])
  return getDashboardSummary(role, user.id, days)
})
