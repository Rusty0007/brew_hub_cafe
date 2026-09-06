export type DashboardRole = 'admin' | 'manager' | 'cashier' | 'customer'

export interface DashboardPoint {
  label: string
  value: number
}

export interface DashboardSummary {
  title: string
  scope: string
  generatedAt: string
  metrics: Array<{ label: string, value: number, money?: boolean, detail: string }>
  trend: { title: string, points: DashboardPoint[] }
  breakdown: { title: string, points: DashboardPoint[] }
  note: string
}
