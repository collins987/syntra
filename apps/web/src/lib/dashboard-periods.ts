// Pure constants shared between the dashboard's server-side data fetching
// (lib/dashboard.ts) and its client-side period picker. This file must never
// import anything that touches next/headers — a "use client" component that
// imports even one unused value from a module which does gets that module's
// whole import graph pulled into the client bundle, which is a build-time
// failure, not just a bloat problem.

export const DASHBOARD_PERIODS = [7, 30, 90] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]
export const DEFAULT_PERIOD: DashboardPeriod = 30

export function isDashboardPeriod(value: unknown): value is DashboardPeriod {
  return DASHBOARD_PERIODS.includes(Number(value) as DashboardPeriod)
}
