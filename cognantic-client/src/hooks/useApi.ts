// ─────────────────────────────────────────────────────────────────
// Cognantic – useApi generic data-fetching hook
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiState<T> {
  data:      T | null
  isLoading: boolean
  error:     string | null
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = [],
) {
  const [state, setState] = useState<UseApiState<T>>({
    data:      null,
    isLoading: true,
    error:     null,
  })

  const mounted = useRef(true)

  const execute = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }))
    try {
      const res = await fetcher()
      if (mounted.current) setState({ data: res.data, isLoading: false, error: null })
    } catch (err) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setState({ data: null, isLoading: false, error: msg })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mounted.current = true
    execute()
    return () => { mounted.current = false }
  }, [execute])

  return { ...state, refetch: execute }
}
