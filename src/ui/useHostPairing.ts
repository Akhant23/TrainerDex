import { useSyncExternalStore } from 'react'
import { secondScreenHost, type HostState } from '../systems/secondScreen'

/** The desktop's phone pairing, for the system bar button and its panel. */
export function useHostPairing(): HostState {
  return useSyncExternalStore(secondScreenHost.subscribe, secondScreenHost.get)
}
