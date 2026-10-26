import { useSyncExternalStore } from 'react'
import { audio, type MusicStatus } from '../systems/audio'

/** What the music is doing right now (the jukebox and the system bar's LED follow it). */
export function useMusicStatus(): MusicStatus {
  return useSyncExternalStore(audio.subscribe, audio.getStatus)
}
