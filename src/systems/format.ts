/** "H:MM" like a save file. Hours keep counting past 99 (unlike the real thing). */
export function formatPlaytime(totalSeconds: number): { hours: string; minutes: string } {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  return { hours: String(hours), minutes: String(minutes).padStart(2, '0') }
}

/** Visitor names: letters, numbers, spaces and a little punctuation, max 12 characters. */
export const NAME_MAX = 12
export function sanitiseName(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} .'\-_]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
}
