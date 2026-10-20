import { useEffect, useState } from 'react'
import { onAssetLoad } from '../sprites/assets'

/** Re-render once a hand-drawn sprite override finishes loading. */
export function useAssetLoads() {
  const [, setN] = useState(0)
  useEffect(() => onAssetLoad(() => setN((n) => n + 1)), [])
}
