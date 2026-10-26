import { useCallback, useState } from 'react'
import { load, save } from '../systems/storage'

/**
 * A small choice remembered in this browser (e.g. how the admin likes a list sorted). Anything
 * stored that isn't a valid choice any more falls back.
 */
export function useSavedChoice<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => load(key, fallback, isValid))
  const set = useCallback(
    (v: T) => {
      setValue(v)
      save(key, v)
    },
    [key],
  )
  return [value, set]
}
