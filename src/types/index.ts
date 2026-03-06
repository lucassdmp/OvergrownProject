// Global type definitions shared across the app

// ── Game types ────────────────────────────────────────────────────────────────
export * from './game'

// ── API / shared utility types ────────────────────────────────────────────────
export interface ApiError {
  message: string
  status: number
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
