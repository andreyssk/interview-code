import { useEffect, useState } from 'react'

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable; state still works in memory
  }
}

// Everything lives in the browser: the backend only runs code.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = readStorage(key)
    if (raw === null) return initial
    try {
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    writeStorage(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
