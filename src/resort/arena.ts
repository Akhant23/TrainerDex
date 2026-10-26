/**
 * Where a battle takes place: a map and the tile its camera looks out from. Pure data (no drawing),
 * shared by the battle screens.
 */
import { ARENA_SPOT, arenas, maps, type ArenaId, type MapId, type ResortMap } from './maps.ts'

export interface Arena {
  map: MapId | ArenaId
  x: number
  y: number
}

/** The map an arena is drawn from: a resort map, or one of the tower's battle halls. */
export const arenaMapOf = (a: Arena): ResortMap => (a.map in arenas ? arenas[a.map as ArenaId] : maps[a.map as MapId])

/**
 * Quick exhibition matches happen in the tower's lobby hall: the camera stands well back in the
 * hall, so the foe's platform rests on open floor mid-room, the way BW's far platform always does.
 */
export const RECEPTION_ARENA: Arena = { map: 'arena0', ...ARENA_SPOT }

/** Outdoors the camera zooms in a touch to fill the screen; the tower's halls are built deep enough to need none. */
export const arenaZoom = (a: Arena) => (a.map in arenas ? 1 : arenaMapOf(a).outdoor ? 1.15 : 1.4)
