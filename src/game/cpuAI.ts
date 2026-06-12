import { GameState, SectionId, Player, Card, Section } from './types'

// Cards that require a player ID as target (not a section)
const PLAYER_TARGET_EFFECTS = new Set(['capture', 'stun', 'encourage', 'scout', 'escape', 'release', 'forced_release'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectionsByDamage(sections: Section[]): Section[] {
  return [...sections]
    .filter((s) => !s.isCollapsed)
    .sort((a, b) => a.hp - b.hp)
}

function mostVulnerableSection(sections: Section[]): Section {
  return sectionsByDamage(sections)[0] ?? sections[0]
}

function needsPlayerTarget(card: Card): boolean {
  return PLAYER_TARGET_EFFECTS.has(card.effect)
}

function bestSectionCard(hand: Card[]): Card | null {
  return hand.find((c) => !needsPlayerTarget(c)) ?? null
}

function pickPlayerTarget(state: GameState, bot: Player, effect: string): string | null {
  switch (effect) {
    case 'capture':
    case 'stun': {
      const targets = state.players.filter(
        (p) => p.id !== bot.id && !p.isCaptured && !p.isBot,
      )
      return targets[0]?.id ?? null
    }
    case 'encourage': {
      const targets = state.players.filter((p) => p.id !== bot.id && !p.isCaptured)
      return targets[0]?.id ?? null
    }
    case 'scout': {
      const targets = state.players.filter((p) => p.id !== bot.id)
      return targets[0]?.id ?? null
    }
    case 'escape':
    case 'forced_release': {
      return state.players.find((p) => p.isCaptured && p.id !== bot.id)?.id ?? null
    }
    default:
      return null
  }
}

// ─── Defender CPU ─────────────────────────────────────────────────────────────

export function defenderCpuAction(
  state: GameState,
  bot: Player,
): { cardId: string; targetSection: SectionId } {
  const hand = bot.hand
  if (hand.length === 0) return { cardId: '', targetSection: 'watchtower' }

  const aliveSections = state.sections.filter((s) => !s.isCollapsed)
  const target = state.attackTarget ?? mostVulnerableSection(aliveSections).id

  const repairCard      = hand.find((c) => c.effect === 'repair')
  const fortifyCard     = hand.find((c) => c.effect === 'fortify')
  const emergencyRepair = hand.find((c) => c.effect === 'emergency-repair')
  const lockdown        = hand.find((c) => c.effect === 'lockdown')

  if (repairCard) {
    const repairTarget = sectionsByDamage(aliveSections).find((s) => s.hp < s.maxHp)?.id ?? target
    return { cardId: repairCard.id, targetSection: repairTarget }
  }
  if (fortifyCard) return { cardId: fortifyCard.id, targetSection: target }
  if (emergencyRepair) {
    const s = sectionsByDamage(aliveSections).find((s) => s.hp < s.maxHp - 2)
    if (s) return { cardId: emergencyRepair.id, targetSection: s.id }
  }
  if (lockdown) return { cardId: lockdown.id, targetSection: target }

  // Section-targeting card fallback
  const sectionCard = bestSectionCard(hand)
  if (sectionCard) {
    return { cardId: sectionCard.id, targetSection: mostVulnerableSection(aliveSections).id }
  }

  // Only player-targeting cards remain — use one with a valid target
  for (const card of hand) {
    const playerId = pickPlayerTarget(state, bot, card.effect)
    if (playerId) return { cardId: card.id, targetSection: playerId as unknown as SectionId }
  }

  return { cardId: hand[0].id, targetSection: mostVulnerableSection(aliveSections).id }
}

// ─── Traitor CPU ──────────────────────────────────────────────────────────────

export function traitorCpuVote(state: GameState, bot: Player): SectionId {
  const aliveSections = state.sections.filter((s) => !s.isCollapsed)

  const scored = aliveSections.map((s) => {
    let score = 0
    score += (s.maxHp - s.hp) * 2
    score += s.markers.filter((m) => m.type === 'damage').length * 3
    if (!s.fortified) score += 2
    if (!s.bonusActive) score += 1
    if (s.isCollapsed) score = -999
    return { id: s.id, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.id ?? 'gate'
}

export function traitorCpuMarkerTarget(state: GameState, bot: Player): SectionId {
  const votes = Object.values(state.traitorVotes)
  if (votes.length > 0) {
    const tally: Record<string, number> = {}
    votes.forEach((v) => { tally[v] = (tally[v] ?? 0) + 1 })
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as SectionId
    return best
  }
  return mostVulnerableSection(state.sections.filter((s) => !s.isCollapsed)).id
}

export function traitorCpuAction(
  state: GameState,
  bot: Player,
): { cardId: string; targetSection: SectionId; sabotageSection?: SectionId } {
  const hand = bot.hand
  if (hand.length === 0) return { cardId: '', targetSection: 'gate' }

  const aliveSections = state.sections.filter((s) => !s.isCollapsed)
  const vulnerable = mostVulnerableSection(aliveSections)

  if (bot.isTransformed) {
    const breath  = hand.find((c) => c.effect === 'breath')
    const crack   = hand.find((c) => c.effect === 'crack')
    const rampage = hand.find((c) => c.effect === 'rampage')
    const raid    = hand.find((c) => c.effect === 'raid')
    const stun    = hand.find((c) => c.effect === 'stun')
    const escape  = hand.find((c) => c.effect === 'escape')

    if (rampage) return { cardId: rampage.id, targetSection: vulnerable.id }
    if (breath)  return { cardId: breath.id,  targetSection: vulnerable.id }
    if (raid)    return { cardId: raid.id,     targetSection: state.attackTarget ?? vulnerable.id }
    if (crack) {
      const wt = state.sections.find((s) => s.id === 'watchtower' && !s.isCollapsed)
      return { cardId: crack.id, targetSection: wt?.id ?? vulnerable.id }
    }
    if (stun) {
      const pid = pickPlayerTarget(state, bot, 'stun')
      if (pid) return { cardId: stun.id, targetSection: pid as unknown as SectionId }
    }
    if (escape) {
      const pid = pickPlayerTarget(state, bot, 'escape')
      if (pid) return { cardId: escape.id, targetSection: pid as unknown as SectionId }
    }

    const fallback = bestSectionCard(hand)
    return { cardId: fallback?.id ?? hand[0].id, targetSection: vulnerable.id }
  }

  // Latent traitor: look innocent, avoid player-targeting cards
  // Secretly sabotage the attack target (or most vulnerable section)
  const sabotageSection: SectionId = state.attackTarget ?? vulnerable.id

  const cursedCard = hand.find((c) => c.type === 'cursed' && !needsPlayerTarget(c))
  if (cursedCard) {
    const decoy = aliveSections.find((s) => s.id !== (state.attackTarget ?? vulnerable.id)) ?? aliveSections[0]
    return { cardId: cursedCard.id, targetSection: decoy.id, sabotageSection }
  }

  const repairCard = hand.find((c) => c.effect === 'repair')
  if (repairCard) {
    const healthiest = [...aliveSections].sort((a, b) => b.hp - a.hp)[0]
    return { cardId: repairCard.id, targetSection: healthiest?.id ?? 'watchtower', sabotageSection }
  }

  const sectionCard = bestSectionCard(hand)
  if (sectionCard) return { cardId: sectionCard.id, targetSection: aliveSections[0]?.id ?? 'watchtower', sabotageSection }

  // Only player-targeting cards left
  for (const card of hand) {
    const pid = pickPlayerTarget(state, bot, card.effect)
    if (pid) return { cardId: card.id, targetSection: pid as unknown as SectionId, sabotageSection }
  }

  return { cardId: hand[0].id, targetSection: aliveSections[0]?.id ?? 'watchtower', sabotageSection }
}

export function shouldTransform(state: GameState, bot: Player): boolean {
  if (bot.isTransformed) return false
  if (bot.isCaptured) return true
  if (state.round >= 5 && state.collapsedCount >= 1) return true
  if (state.round >= 6) return true
  const hasAttackCards = bot.hand.some((c) => ['breath', 'rampage', 'raid'].includes(c.effect))
  if (state.round >= 4 && hasAttackCards) return Math.random() < 0.4
  return false
}
