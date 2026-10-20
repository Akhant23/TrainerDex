/**
 * Deterministic turn-based battle engine.
 *
 * Pure functions over plain data: (state, action) → (new state, events). All randomness comes
 * from a seeded PRNG stored in the state, so the same seed + actions always replay identically
 * (that's what the tests rely on). The UI just plays the returned events back.
 */
import { difficulties, effectiveness, moves, species, type Difficulty, type Move, type MoveId, type SpeciesId, type StatId } from './data'

/* ---------------- Types ---------------- */

export type SideId = 0 | 1 // 0 = visitor, 1 = Aaryan

export interface Mon {
  species: SpeciesId
  level: number
  hp: number
  maxHp: number
  stats: { atk: number; def: number; spe: number }
  stages: Record<StatId, number>
  moves: Array<{ id: MoveId; pp: number }>
}

export interface Side {
  team: Mon[]
  active: number
  potions: number
}

export type Phase = 'choose' | 'replace' | 'over'

export interface BattleState {
  rng: number
  turn: number
  difficulty: Difficulty
  sides: [Side, Side]
  phase: Phase
  winner: SideId | null
  aiSwitches: number
  stats: { crits: number; superEffective: number; damageDealt: number }
}

export type Action =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; index: number }
  | { kind: 'potion' }
  | { kind: 'forfeit' }

export type BattleEvent =
  | { t: 'text'; text: string }
  | { t: 'move'; side: SideId; move: MoveId }
  | { t: 'miss'; side: SideId }
  | { t: 'damage'; side: SideId; amount: number; hp: number; crit: boolean; eff: number; self?: boolean }
  | { t: 'heal'; side: SideId; amount: number; hp: number }
  | { t: 'stat'; side: SideId; stat: StatId; delta: number }
  | { t: 'faint'; side: SideId }
  | { t: 'switchOut'; side: SideId }
  | { t: 'switchIn'; side: SideId; index: number; hp: number }
  | { t: 'end'; winner: SideId }

/* ---------------- RNG (mulberry32) ---------------- */

function nextRandom(state: BattleState): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* ---------------- Setup ---------------- */

const STAGE_NAMES: Record<StatId, string> = { atk: 'ATTACK', def: 'DEFENCE', spe: 'SPEED', acc: 'accuracy', crit: 'critical-hit rate' }

export function makeMon(id: SpeciesId, level: number): Mon {
  const sp = species[id]
  const stat = (b: number) => Math.floor((2 * b * level) / 100) + 5
  const maxHp = Math.floor((2 * sp.base.hp * level) / 100) + level + 10
  return {
    species: id,
    level,
    hp: maxHp,
    maxHp,
    stats: { atk: stat(sp.base.atk), def: stat(sp.base.def), spe: stat(sp.base.spe) },
    stages: { atk: 0, def: 0, spe: 0, acc: 0, crit: 0 },
    moves: sp.moves.map((m) => ({ id: m, pp: moves[m].pp })),
  }
}

/** Visitor's team: the chosen starter leads (+2 levels), the other two follow. */
export function createBattle(difficulty: Difficulty, starter: SpeciesId, seed: number): BattleState {
  const d = difficulties[difficulty]
  const others = (['byterat', 'beakerbun', 'riffin'] as SpeciesId[]).filter((s) => s !== starter)
  return {
    rng: seed | 0,
    turn: 0,
    difficulty,
    sides: [
      { team: [makeMon(starter, d.playerLevel + 2), ...others.map((s) => makeMon(s, d.playerLevel))], active: 0, potions: d.playerPotions },
      { team: d.team.map((s) => makeMon(s, d.level)), active: 0, potions: d.aiPotions },
    ],
    phase: 'choose',
    winner: null,
    aiSwitches: 0,
    stats: { crits: 0, superEffective: 0, damageDealt: 0 },
  }
}

/* ---------------- Helpers ---------------- */

export const active = (s: BattleState, side: SideId) => s.sides[side].team[s.sides[side].active]
export const nameOf = (m: Mon) => species[m.species].name
const foe = (side: SideId): SideId => (side === 0 ? 1 : 0)
const label = (s: BattleState, side: SideId) => (side === 0 ? nameOf(active(s, side)) : `The foe’s ${nameOf(active(s, side))}`)

function stageMult(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)
}
function accMult(stage: number): number {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage)
}
export function effectiveSpeed(m: Mon) {
  return m.stats.spe * stageMult(m.stages.spe)
}
const CRIT_RATES = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2]

export function usableMoves(m: Mon): number[] {
  return m.moves.map((mv, i) => (mv.pp > 0 ? i : -1)).filter((i) => i >= 0)
}
export function alive(side: Side): number[] {
  return side.team.map((m, i) => (m.hp > 0 ? i : -1)).filter((i) => i >= 0)
}

/** Expected damage (no randomness) — used by the AI and the tests. */
export function estimateDamage(attacker: Mon, defender: Mon, move: Move): number {
  if (move.power === 0) return 0
  const eff = effectiveness(move.type, species[defender.species].types)
  const stab = species[attacker.species].types.includes(move.type) ? 1.5 : 1
  let power = move.power
  if (move.effect.kind === 'finisher' && defender.hp * 2 <= defender.maxHp) power *= 2
  const base = baseDamage(attacker.level, power, attacker.stats.atk * stageMult(attacker.stages.atk), defender.stats.def * stageMult(defender.stages.def))
  return base * stab * eff * 0.925 * ((move.accuracy || 100) / 100)
}

function baseDamage(level: number, power: number, atk: number, def: number) {
  return Math.floor(Math.floor((Math.floor((2 * level) / 5 + 2) * power * atk) / def) / 50) + 2
}

/* ---------------- Turn resolution ---------------- */

function clone(s: BattleState): BattleState {
  return structuredClone(s)
}

function applyStages(state: BattleState, side: SideId, stats: Partial<Record<StatId, number>>, ev: BattleEvent[]) {
  const mon = active(state, side)
  for (const [k, v] of Object.entries(stats) as Array<[StatId, number]>) {
    const max = k === 'crit' ? 4 : 6
    const before = mon.stages[k]
    const after = Math.max(-6, Math.min(max, before + v))
    if (after === before) {
      ev.push({ t: 'text', text: `${label(state, side)}’s ${STAGE_NAMES[k]} won’t go any ${v > 0 ? 'higher' : 'lower'}!` })
      continue
    }
    mon.stages[k] = after
    ev.push({ t: 'stat', side, stat: k, delta: after - before })
    const word = Math.abs(after - before) >= 2 ? (v > 0 ? 'rose sharply' : 'harshly fell') : v > 0 ? 'rose' : 'fell'
    ev.push({ t: 'text', text: k === 'crit' ? `${label(state, side)} is getting pumped!` : `${label(state, side)}’s ${STAGE_NAMES[k]} ${word}!` })
  }
}

function dealDamage(state: BattleState, side: SideId, amount: number, ev: BattleEvent[], extra: { crit?: boolean; eff?: number; self?: boolean } = {}) {
  const mon = active(state, side)
  const dealt = Math.min(mon.hp, Math.max(1, Math.floor(amount)))
  mon.hp -= dealt
  if (side === 1 && !extra.self) state.stats.damageDealt += dealt
  ev.push({ t: 'damage', side, amount: dealt, hp: mon.hp, crit: !!extra.crit, eff: extra.eff ?? 1, self: extra.self })
}

function heal(state: BattleState, side: SideId, amount: number, ev: BattleEvent[]) {
  const mon = active(state, side)
  const healed = Math.min(mon.maxHp - mon.hp, Math.floor(amount))
  if (healed <= 0) {
    ev.push({ t: 'text', text: `${label(state, side)}’s HP is already full!` })
    return
  }
  mon.hp += healed
  ev.push({ t: 'heal', side, amount: healed, hp: mon.hp })
  ev.push({ t: 'text', text: `${label(state, side)} regained health!` })
}

function hit(state: BattleState, side: SideId, move: Move, power: number, ev: BattleEvent[]) {
  const user = active(state, side)
  const target = active(state, foe(side))
  const eff = effectiveness(move.type, species[target.species].types)
  const critChance = CRIT_RATES[Math.min(4, user.stages.crit)]
  const crit = nextRandom(state) < critChance
  // crits ignore the attacker's drops and the defender's boosts, like the games
  const atkStage = crit ? Math.max(0, user.stages.atk) : user.stages.atk
  const defStage = crit ? Math.min(0, target.stages.def) : target.stages.def
  let dmg = baseDamage(user.level, power, user.stats.atk * stageMult(atkStage), target.stats.def * stageMult(defStage))
  if (species[user.species].types.includes(move.type)) dmg *= 1.5
  dmg *= eff
  if (crit) dmg *= 1.5
  dmg *= 0.85 + nextRandom(state) * 0.15
  dealDamage(state, foe(side), dmg, ev, { crit, eff })
  if (crit) {
    state.stats.crits += side === 0 ? 1 : 0
    ev.push({ t: 'text', text: 'A critical hit!' })
  }
  if (eff > 1) {
    if (side === 0) state.stats.superEffective++
    ev.push({ t: 'text', text: 'It’s super effective!' })
  } else if (eff < 1) ev.push({ t: 'text', text: 'It’s not very effective…' })
}

function performMove(state: BattleState, side: SideId, moveIndex: number, ev: BattleEvent[]) {
  const user = active(state, side)
  const target = active(state, foe(side))
  let move: Move
  if (moveIndex < 0) {
    move = moves.struggle
    ev.push({ t: 'text', text: `${label(state, side)} has no moves left!` })
  } else {
    move = moves[user.moves[moveIndex].id]
    user.moves[moveIndex].pp--
  }
  ev.push({ t: 'text', text: `${label(state, side)} used ${move.name}!` })
  ev.push({ t: 'move', side, move: move.id as MoveId })

  // accuracy
  if (move.accuracy > 0) {
    const chance = (move.accuracy / 100) * accMult(user.stages.acc)
    if (nextRandom(state) >= chance) {
      ev.push({ t: 'miss', side })
      ev.push({ t: 'text', text: `${label(state, side)}’s attack missed!` })
      return
    }
  }

  const fx = move.effect
  if (fx.kind === 'experiment') {
    const roll = nextRandom(state)
    if (roll < 0.45) {
      ev.push({ t: 'text', text: 'The experiment was a success!' })
      hit(state, side, move, 100, ev)
    } else if (roll < 0.7) {
      ev.push({ t: 'text', text: 'It produced a healing tonic!' })
      heal(state, side, user.maxHp / 4, ev)
    } else if (roll < 0.88) {
      ev.push({ t: 'text', text: 'It released a weakening gas!' })
      hit(state, side, move, 45, ev)
      if (target.hp > 0) applyStages(state, foe(side), { def: -1 }, ev)
    } else {
      ev.push({ t: 'text', text: 'The experiment blew up in its face!' })
      dealDamage(state, side, user.maxHp / 10, ev, { self: true })
    }
    return
  }

  if (move.power > 0) {
    const power = fx.kind === 'finisher' && target.hp * 2 <= target.maxHp ? move.power * 2 : move.power
    if (fx.kind === 'finisher' && power > move.power) ev.push({ t: 'text', text: 'Time for the closing argument!' })
    hit(state, side, move, power, ev)
  }

  if (fx.kind === 'self' && user.hp > 0 && (!fx.chance || nextRandom(state) * 100 < fx.chance)) applyStages(state, side, fx.stats, ev)
  if (fx.kind === 'target' && target.hp > 0 && (!fx.chance || nextRandom(state) * 100 < fx.chance)) applyStages(state, foe(side), fx.stats, ev)
  if (fx.kind === 'heal') heal(state, side, user.maxHp * fx.fraction, ev)
  if (fx.kind === 'recoil' && user.hp > 0) {
    ev.push({ t: 'text', text: `${label(state, side)} is hurt by the strain!` })
    dealDamage(state, side, user.maxHp * fx.fraction, ev, { self: true })
  }
}

function switchIn(state: BattleState, side: SideId, index: number, ev: BattleEvent[], voluntary: boolean) {
  const s = state.sides[side]
  if (voluntary) {
    ev.push({ t: 'text', text: side === 0 ? `${nameOf(active(state, 0))}, come back!` : `Aaryan withdrew ${nameOf(active(state, 1))}!` })
    ev.push({ t: 'switchOut', side })
  }
  // stat stages reset on switching out
  active(state, side).stages = { atk: 0, def: 0, spe: 0, acc: 0, crit: 0 }
  s.active = index
  ev.push({ t: 'switchIn', side, index, hp: s.team[index].hp })
  ev.push({ t: 'text', text: side === 0 ? `Go! ${nameOf(active(state, 0))}!` : `Aaryan sent out ${nameOf(active(state, 1))}!` })
}

/** Resolve one full turn from the visitor's action (the AI picks its own). */
export function takeTurn(prev: BattleState, action: Action, aiAction?: Action): { state: BattleState; events: BattleEvent[] } {
  if (prev.phase !== 'choose') throw new Error(`takeTurn called during phase ${prev.phase}`)
  const state = clone(prev)
  const ev: BattleEvent[] = []

  if (action.kind === 'forfeit') {
    ev.push({ t: 'text', text: 'You forfeited the match.' })
    state.phase = 'over'
    state.winner = 1
    ev.push({ t: 'end', winner: 1 })
    return { state, events: ev }
  }

  state.turn++
  const ai = aiAction ?? chooseAiAction(state)
  const actions: Array<{ side: SideId; a: Action }> = [
    { side: 0, a: action },
    { side: 1, a: ai },
  ]

  // 1. switches and items happen first (visitor before AI)
  for (const { side, a } of actions) {
    if (a.kind === 'switch') switchIn(state, side, a.index, ev, true)
    if (a.kind === 'potion') {
      state.sides[side].potions--
      ev.push({ t: 'text', text: side === 0 ? 'You used a POTION!' : 'Aaryan used a POTION!' })
      heal(state, side, active(state, side).maxHp / 2, ev)
    }
  }

  // 2. moves by priority, then speed (ties broken randomly)
  const movers = actions.filter((x) => x.a.kind === 'move') as Array<{ side: SideId; a: { kind: 'move'; index: number } }>
  const prio = (x: (typeof movers)[number]) => (x.a.index >= 0 ? moves[active(state, x.side).moves[x.a.index].id].priority ?? 0 : 0)
  movers.sort((x, y) => {
    const p = prio(y) - prio(x)
    if (p) return p
    const sp = effectiveSpeed(active(state, y.side)) - effectiveSpeed(active(state, x.side))
    if (sp) return sp
    return nextRandom(state) < 0.5 ? -1 : 1
  })

  const fainted = new Set<SideId>()
  for (const { side, a } of movers) {
    if (fainted.has(side)) continue
    const idx = usableMoves(active(state, side)).length === 0 ? -1 : a.index
    performMove(state, side, idx, ev)
    for (const sd of [0, 1] as SideId[]) {
      if (active(state, sd).hp <= 0 && !fainted.has(sd)) {
        fainted.add(sd)
        ev.push({ t: 'faint', side: sd })
        ev.push({ t: 'text', text: `${label(state, sd)} fainted!` })
      }
    }
  }

  if (endIfDone(state, ev)) return { state, events: ev }

  // 3. replacements: the AI replaces immediately; the visitor chooses
  if (active(state, 1).hp <= 0) switchIn(state, 1, chooseAiReplacement(state), ev, false)
  if (active(state, 0).hp <= 0) state.phase = 'replace'
  return { state, events: ev }
}

function endIfDone(state: BattleState, ev: BattleEvent[]): boolean {
  for (const side of [0, 1] as SideId[]) {
    if (alive(state.sides[side]).length === 0) {
      state.phase = 'over'
      state.winner = foe(side)
      ev.push({ t: 'end', winner: foe(side) })
      return true
    }
  }
  return false
}

/** Visitor picks a replacement after a faint. */
export function replace(prev: BattleState, index: number): { state: BattleState; events: BattleEvent[] } {
  if (prev.phase !== 'replace') throw new Error('replace called outside the replace phase')
  if (prev.sides[0].team[index]?.hp <= 0) throw new Error('cannot send out a fainted creature')
  const state = clone(prev)
  const ev: BattleEvent[] = []
  switchIn(state, 0, index, ev, false)
  state.phase = 'choose'
  return { state, events: ev }
}

/** Opening lines and first send-outs. */
export function openingEvents(state: BattleState): BattleEvent[] {
  return [
    { t: 'text', text: 'TRAINER AARYAN wants to battle!' },
    { t: 'switchIn', side: 1, index: state.sides[1].active, hp: active(state, 1).hp },
    { t: 'text', text: `TRAINER AARYAN sent out ${nameOf(active(state, 1))}!` },
    { t: 'switchIn', side: 0, index: state.sides[0].active, hp: active(state, 0).hp },
    { t: 'text', text: `Go! ${nameOf(active(state, 0))}!` },
  ]
}

/* ---------------- AI ---------------- */

/** Pick Aaryan's action for this turn. Uses the battle's RNG, so it's deterministic too. */
export function chooseAiAction(state: BattleState): Action {
  const me = active(state, 1)
  const them = active(state, 0)
  const usable = usableMoves(me)
  if (usable.length === 0) return { kind: 'move', index: -1 }
  const scored = usable.map((i) => ({ i, move: moves[me.moves[i].id], dmg: estimateDamage(me, them, moves[me.moves[i].id]) }))
  const damaging = scored.filter((x) => x.move.power > 0)
  const best = [...scored].sort((a, b) => b.dmg - a.dmg)[0]
  const pick = <T,>(xs: T[]) => xs[Math.floor(nextRandom(state) * xs.length)]

  switch (state.difficulty) {
    case 'casual':
      return { kind: 'move', index: (nextRandom(state) < 0.7 && damaging.length ? pick(damaging) : pick(scored)).i }

    case 'standard': {
      if (state.sides[1].potions > 0 && me.hp < me.maxHp * 0.25 && nextRandom(state) < 0.6) return { kind: 'potion' }
      return { kind: 'move', index: nextRandom(state) < 0.7 ? best.i : pick(scored).i }
    }

    case 'champion': {
      // 1. take a KO when it's there (prefer the most accurate one)
      const kos = scored.filter((x) => x.move.power > 0 && x.dmg / ((x.move.accuracy || 100) / 100) >= them.hp)
      if (kos.length) return { kind: 'move', index: kos.sort((a, b) => (b.move.accuracy || 100) - (a.move.accuracy || 100))[0].i }

      const threat = Math.max(0, ...them.moves.filter((m) => m.pp > 0).map((m) => estimateDamage(them, me, moves[m.id])))
      // 2. heal when low and it would survive the next hit after healing
      if (state.sides[1].potions > 0 && me.hp < me.maxHp * 0.3 && threat < me.maxHp * 0.5) return { kind: 'potion' }
      // 3. switch out of a bad matchup into something that resists
      if (state.aiSwitches < 2 && threat >= me.hp * 0.9 && best.dmg < them.hp * 0.4) {
        const options = alive(state.sides[1]).filter((i) => i !== state.sides[1].active)
        const safe = options
          .map((i) => ({ i, t: Math.max(0, ...them.moves.map((m) => estimateDamage(them, state.sides[1].team[i], moves[m.id]))) / state.sides[1].team[i].hp }))
          .sort((a, b) => a.t - b.t)[0]
        if (safe && safe.t < 0.5) {
          state.aiSwitches++
          return { kind: 'switch', index: safe.i }
        }
      }
      // 4. set up when healthy and not under pressure
      const setup = scored.find((x) => x.move.effect.kind === 'self' && x.move.power === 0 && (me.stages.atk < 2 || me.stages.spe < 1 || me.stages.def < 2))
      if (setup && me.hp > me.maxHp * 0.7 && threat < me.hp * 0.35 && state.turn <= 4) return { kind: 'move', index: setup.i }
      return { kind: 'move', index: best.i }
    }
  }
}

/** Which creature the AI sends in after a faint. */
export function chooseAiReplacement(state: BattleState): number {
  const options = alive(state.sides[1])
  if (state.difficulty === 'casual') return options[0]
  const them = active(state, 0)
  // best ratio of damage dealt vs damage taken
  return options
    .map((i) => {
      const mon = state.sides[1].team[i]
      const out = Math.max(...mon.moves.map((m) => estimateDamage(mon, them, moves[m.id])))
      const inn = Math.max(1, ...them.moves.map((m) => estimateDamage(them, mon, moves[m.id])))
      // keep the ace (last slot) for later
      const acePenalty = i === state.sides[1].team.length - 1 && options.length > 1 ? 0.6 : 1
      return { i, score: (out / inn) * acePenalty }
    })
    .sort((a, b) => b.score - a.score)[0].i
}
