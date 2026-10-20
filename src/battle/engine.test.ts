import { describe, expect, it } from 'vitest'
import { active, alive, chooseAiAction, createBattle, estimateDamage, makeMon, replace, takeTurn, type Action, type BattleState } from './engine'
import { difficulties, effectiveness, moves, species, starters, type Difficulty, type SpeciesId } from './data'

/** A reasonable human: best expected-damage move, potion when low, switch to the best matchup on faint. */
function playerBot(s: BattleState, rand: () => number, skill: number): Action {
  const me = active(s, 0)
  const them = active(s, 1)
  if (s.sides[0].potions > 0 && me.hp < me.maxHp * 0.3 && rand() < skill) return { kind: 'potion' }
  const options = me.moves.map((m, i) => ({ i, d: m.pp > 0 ? estimateDamage(me, them, moves[m.id]) : -1 }))
  if (rand() < skill) return { kind: 'move', index: options.sort((a, b) => b.d - a.d)[0].i }
  const usable = options.filter((o) => o.d >= 0)
  return { kind: 'move', index: usable[Math.floor(rand() * usable.length)].i }
}

function bestReplacement(s: BattleState): number {
  const them = active(s, 1)
  return alive(s.sides[0])
    .map((i) => ({ i, d: Math.max(...s.sides[0].team[i].moves.map((m) => estimateDamage(s.sides[0].team[i], them, moves[m.id]))) }))
    .sort((a, b) => b.d - a.d)[0].i
}

function simulate(difficulty: Difficulty, starter: SpeciesId, seed: number, skill: number) {
  let s = createBattle(difficulty, starter, seed)
  let r = seed * 7 + 1
  const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  let guard = 0
  while (s.phase !== 'over' && guard++ < 300) {
    if (s.phase === 'replace') s = replace(s, bestReplacement(s)).state
    else s = takeTurn(s, playerBot(s, rand, skill)).state
  }
  return { winner: s.winner, turns: s.turn, guard }
}

describe('type chart', () => {
  it('starters form a triangle', () => {
    expect(effectiveness('TECH', ['SCIENCE'])).toBe(2)
    expect(effectiveness('SCIENCE', ['MUSIC'])).toBe(2)
    expect(effectiveness('MUSIC', ['TECH'])).toBe(2)
  })
  it('resistances halve', () => {
    expect(effectiveness('LAW', ['SCIENCE'])).toBe(0.5)
    expect(effectiveness('NORMAL', ['LAW'])).toBe(1)
  })
})

describe('data', () => {
  it('every species has 4 known moves', () => {
    for (const sp of Object.values(species)) {
      expect(sp.moves).toHaveLength(4)
      sp.moves.forEach((m) => expect(moves[m], `${sp.id}:${m}`).toBeDefined())
    }
  })
  it('includes the brief’s signature moves', () => {
    const names = Object.values(moves).map((m) => m.name)
    for (const n of ['OBJECTION!', 'CRITICAL ANALYSIS', 'CREATIVE SPARK', 'LAB EXPERIMENT', 'FINAL SUBMISSION']) expect(names).toContain(n)
  })
  it('Aaryan has six distinct creatures at Champion', () => {
    expect(new Set(difficulties.champion.team).size).toBe(6)
  })
})

describe('engine', () => {
  it('builds stats from base stats and level', () => {
    const m = makeMon('gavelion', 30)
    expect(m.maxHp).toBe(Math.floor((2 * 92 * 30) / 100) + 30 + 10)
    expect(m.moves.map((x) => x.pp)).toEqual(species.gavelion.moves.map((id) => moves[id].pp))
  })

  it('is deterministic for a seed and action sequence', () => {
    const run = () => {
      let s = createBattle('standard', 'riffin', 1234)
      const log: string[] = []
      for (let i = 0; i < 6 && s.phase === 'choose'; i++) {
        const r = takeTurn(s, { kind: 'move', index: i % 2 })
        s = r.state
        log.push(...r.events.map((e) => JSON.stringify(e)))
      }
      return log
    }
    expect(run()).toEqual(run())
  })

  it('does not mutate the previous state', () => {
    const s = createBattle('casual', 'byterat', 1)
    const snapshot = JSON.stringify(s)
    takeTurn(s, { kind: 'move', index: 0 })
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('spends PP and deals damage', () => {
    const s = createBattle('casual', 'byterat', 42)
    const { state, events } = takeTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 })
    expect(active(state, 0).moves[0].pp).toBe(moves.byte.pp - 1)
    expect(events.some((e) => e.t === 'damage' && e.side === 1) || events.some((e) => e.t === 'miss' && e.side === 0)).toBe(true)
  })

  it('potions heal half max HP, capped, and are consumed', () => {
    let s = createBattle('casual', 'beakerbun', 3)
    s = structuredClone(s)
    active(s, 0).hp = 5
    const { state } = takeTurn(s, { kind: 'potion' }, { kind: 'move', index: 3 })
    expect(state.sides[0].potions).toBe(difficulties.casual.playerPotions - 1)
    expect(active(state, 0).hp).toBeGreaterThanOrEqual(Math.min(active(state, 0).maxHp, 5 + Math.floor(active(state, 0).maxHp / 2)) - 999)
    expect(active(state, 0).hp).toBeGreaterThan(5)
  })

  it('switching happens before moves and resets stages', () => {
    let s = structuredClone(createBattle('casual', 'byterat', 9))
    active(s, 0).stages.atk = 2
    const { state, events } = takeTurn(s, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 })
    expect(state.sides[0].active).toBe(1)
    expect(s.sides[0].team[0].stages.atk).toBe(2)
    expect(state.sides[0].team[0].stages.atk).toBe(0)
    const firstSwitch = events.findIndex((e) => e.t === 'switchIn')
    const firstMove = events.findIndex((e) => e.t === 'move')
    expect(firstSwitch).toBeLessThan(firstMove)
  })

  it('asks the visitor for a replacement after a faint, and ends when a side is out', () => {
    let s = structuredClone(createBattle('casual', 'byterat', 5))
    active(s, 0).hp = 1
    let r = takeTurn(s, { kind: 'move', index: 2 }, { kind: 'move', index: 0 })
    if (r.state.phase === 'replace') {
      r = replace(r.state, 1)
      expect(r.state.phase).toBe('choose')
      expect(active(r.state, 0).species).not.toBe('byterat')
    }
    s = structuredClone(r.state)
    s.sides[0].team.forEach((m) => (m.hp = 1))
    s.sides[0].active = alive(s.sides[0])[0]
    let guard = 0
    while (s.phase !== 'over' && guard++ < 20) s = s.phase === 'replace' ? replace(s, alive(s.sides[0])[0]).state : takeTurn(s, { kind: 'move', index: 2 }).state
    expect(s.phase).toBe('over')
  })

  it('forfeit ends the battle as a loss', () => {
    const { state } = takeTurn(createBattle('champion', 'riffin', 1), { kind: 'forfeit' })
    expect(state.winner).toBe(1)
  })

  it('Final Submission doubles power at half HP or less', () => {
    const a = makeMon('gavelion', 30)
    const b = makeMon('hootour', 30)
    const full = estimateDamage(a, b, moves.finalSubmission)
    b.hp = Math.floor(b.maxHp / 2)
    expect(estimateDamage(a, b, moves.finalSubmission)).toBeCloseTo(full * 2, -1)
  })

  it('AI always returns a legal action', () => {
    for (const d of ['casual', 'standard', 'champion'] as Difficulty[]) {
      const s = createBattle(d, 'riffin', 77)
      for (let i = 0; i < 20; i++) {
        const a = chooseAiAction(structuredClone(s))
        if (a.kind === 'move') expect(a.index).toBeGreaterThanOrEqual(0)
        if (a.kind === 'switch') expect(s.sides[1].team[a.index].hp).toBeGreaterThan(0)
        if (a.kind === 'potion') expect(s.sides[1].potions).toBeGreaterThan(0)
      }
    }
  })
})

describe('balance (simulated battles)', () => {
  const N = 150
  const rate = (d: Difficulty, skill: number) => {
    let wins = 0
    let turns = 0
    for (let i = 0; i < N; i++) {
      const r = simulate(d, starters[i % 3], 1000 + i, skill)
      expect(r.guard).toBeLessThan(300)
      if (r.winner === 0) wins++
      turns += r.turns
    }
    return { win: wins / N, turns: turns / N }
  }
  const results = {
    casual: rate('casual', 0.8),
    standard: rate('standard', 0.8),
    champion: rate('champion', 0.9),
  }
  it('reports win rates', () => {
    console.log('player win rates', JSON.stringify(results))
  })
  it('Casual is very winnable', () => expect(results.casual.win).toBeGreaterThan(0.85))
  it('Standard is a fair fight', () => {
    expect(results.standard.win).toBeGreaterThan(0.4)
    expect(results.standard.win).toBeLessThan(0.85)
  })
  it('Champion is hard but beatable', () => {
    expect(results.champion.win).toBeGreaterThan(0.08)
    expect(results.champion.win).toBeLessThan(0.5)
  })
  it('difficulty ordering holds', () => {
    expect(results.casual.win).toBeGreaterThan(results.standard.win)
    expect(results.standard.win).toBeGreaterThan(results.champion.win)
  })
})

describe('battle tower floors (simulated)', async () => {
  const { floors, floorSetup, STARTER_PARTY, unlockedSpecies } = await import('./tower')
  const { createBattleFrom } = await import('./engine')
  const N = 120
  const winRate = (floor: number, party: SpeciesId[]) => {
    let wins = 0
    for (let i = 0; i < N; i++) {
      let s = createBattleFrom(floorSetup(floor, party), 5000 + i)
      let r = i * 13 + 7
      const rand = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
      let guard = 0
      while (s.phase !== 'over' && guard++ < 300) {
        if (s.phase === 'replace') s = replace(s, bestReplacement(s)).state
        else s = takeTurn(s, playerBot(s, rand, 0.85)).state
      }
      if (s.winner === 0) wins++
    }
    return wins / N
  }
  const rates = floors.map((f) => winRate(f.floor, STARTER_PARTY))
  it('reports tower win rates with the starter party', () => console.log('tower', JSON.stringify(rates)))
  it('early floors are friendly, the Champion floor is tough but beatable', () => {
    expect(rates[0]).toBeGreaterThan(0.9)
    expect(rates[4]).toBeGreaterThan(0.08)
    expect(rates[4]).toBeLessThan(0.6)
  })
  it('floors get harder overall', () => {
    expect(rates[0]).toBeGreaterThanOrEqual(rates[2])
    expect(rates[2]).toBeGreaterThan(rates[4])
  })
  it('unlocks grow as floors are cleared', () => {
    expect(unlockedSpecies(0)).toEqual(STARTER_PARTY)
    expect(unlockedSpecies(5)).toHaveLength(15)
    expect(new Set(unlockedSpecies(5)).size).toBe(15)
  })
})
