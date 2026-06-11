import { GameState, SectionId, Player, Card, Section } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Sections sorted by HP ascending (most damaged first), excluding collapsed */
function sectionsByDamage(sections: Section[]): Section[] {
  return [...sections]
    .filter((s) => !s.isCollapsed)
    .sort((a, b) => a.hp - b.hp)
}

/** The section most likely to collapse next (lowest HP, not collapsed) */
function mostVulnerableSection(sections: Section[]): Section {
  const alive = sectionsByDamage(sections)
  return alive[0] ?? sections[0]
}

/** The watchtower section */
function watchtower(sections: Section[]): Section {
  return sections.find((s) => s.id === 'watchtower')!
}

// ─── Defender CPU ─────────────────────────────────────────────────────────────

/**
 * Returns { cardId, targetSection } for a defender CPU player.
 * Priority: protect low-HP sections, especially the attack target if known.
 */
export function defenderCpuAction(
  state: GameState,
  bot: Player,
): { cardId: string; targetSection: SectionId } {
  const hand = bot.hand
  if (hand.length === 0) {
    // Shouldn't happen, but fallback
    return { cardId: '', targetSection: 'watchtower' }
  }

  const aliveSections = state.sections.filter((s) => !s.isCollapsed)
  const target = state.attackTarget ?? mostVulnerableSection(aliveSections).id

  // Prefer cards in this order
  const repairCard = hand.find((c) => c.effect === 'repair')
  const fortifyCard = hand.find((c) => c.effect === 'fortify')
  const emergencyRepair = hand.find((c) => c.effect === 'emergency-repair')
  const lockdown = hand.find((c) => c.effect === 'lockdown')

  // Under attack: use fortify or repair on target section
  if (repairCard) {
    // Repair the most damaged alive section (or attack target)
    const damaged = sectionsByDamage(aliveSections)
    const repairTarget =
      damaged.find((s) => s.hp < s.maxHp)?.id ?? target
    return { cardId: repairCard.id, targetSection: repairTarget }
  }

  if (fortifyCard) {
    return { cardId: fortifyCard.id, targetSection: target }
  }

  // Cursed cards - use them in less critical situations to avoid suspicion
  if (emergencyRepair) {
    const damaged = sectionsByDamage(aliveSections)
    const s = damaged.find((s) => s.hp < s.maxHp - 2)
    if (s) return { cardId: emergencyRepair.id, targetSection: s.id }
  }

  if (lockdown) {
    return { cardId: lockdown.id, targetSection: target }
  }

  // Fall back to any card on the most vulnerable section
  const card = hand[0]
  return { cardId: card.id, targetSection: mostVulnerableSection(aliveSections).id }
}

// ─── Traitor CPU ──────────────────────────────────────────────────────────────

/**
 * Traitor CPU vote: pick the section that will maximize damage.
 * Prefer sections with existing markers, low HP, or lacking fortification.
 */
export function traitorCpuVote(state: GameState, bot: Player): SectionId {
  const aliveSections = state.sections.filter((s) => !s.isCollapsed)

  // Score each section
  const scored = aliveSections.map((s) => {
    let score = 0
    // Low HP = easier to collapse
    score += (s.maxHp - s.hp) * 2
    // Existing markers = extra damage
    score += s.markers.filter((m) => m.type === 'damage').length * 3
    // Not fortified = more damage gets through
    if (!s.fortified) score += 2
    // Already lost bonus = we've been hitting it
    if (!s.bonusActive) score += 1
    // Avoid collapsed sections
    if (s.isCollapsed) score = -999
    return { id: s.id, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.id ?? 'gate'
}

/**
 * Latent traitor CPU: place a damage marker.
 * Target the same section the traitors voted for, or the most vulnerable.
 */
export function traitorCpuMarkerTarget(state: GameState, bot: Player): SectionId {
  // Align with majority vote if known
  const votes = Object.values(state.traitorVotes)
  if (votes.length > 0) {
    // Find most common vote
    const tally: Record<string, number> = {}
    votes.forEach((v) => { tally[v] = (tally[v] ?? 0) + 1 })
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] as SectionId
    return best
  }
  return mostVulnerableSection(state.sections.filter((s) => !s.isCollapsed)).id
}

/**
 * Traitor CPU action phase:
 * - Transformed: use attack cards
 * - Latent: play cursed or harmless-looking cards to avoid suspicion
 */
export function traitorCpuAction(
  state: GameState,
  bot: Player,
): { cardId: string; targetSection: SectionId } {
  const hand = bot.hand
  if (hand.length === 0) {
    return { cardId: '', targetSection: 'gate' }
  }

  const aliveSections = state.sections.filter((s) => !s.isCollapsed)
  const vulnerable = mostVulnerableSection(aliveSections)

  if (bot.isTransformed) {
    // Use attack cards
    const breath = hand.find((c) => c.effect === 'breath')
    const crack = hand.find((c) => c.effect === 'crack')
    const rampage = hand.find((c) => c.effect === 'rampage')
    const raid = hand.find((c) => c.effect === 'raid')
    const stun = hand.find((c) => c.effect === 'stun')

    // Rampage synergizes with the upcoming attack
    if (rampage) return { cardId: rampage.id, targetSection: vulnerable.id }
    // Breath for direct damage
    if (breath) return { cardId: breath.id, targetSection: vulnerable.id }
    // Raid nullifies repairs before attack
    if (raid) return { cardId: raid.id, targetSection: state.attackTarget ?? vulnerable.id }
    // Crack lowers max HP permanently
    if (crack) {
      const wt = state.sections.find((s) => s.id === 'watchtower' && !s.isCollapsed)
      return { cardId: crack.id, targetSection: wt?.id ?? vulnerable.id }
    }
    if (stun) {
      const defenders = state.players.filter(
        (p) => p.role === 'defender' && !p.isCaptured && !p.isBot,
      )
      const target = defenders[0]
      if (target && stun) {
        return { cardId: stun.id, targetSection: vulnerable.id }
      }
    }
    // Fallback
    return { cardId: hand[0].id, targetSection: vulnerable.id }
  }

  // Latent traitor: look innocent
  // Use cursed cards targeting sections that aren't the focus, or use repair on a healthy section
  const cursedCard = hand.find((c) => c.type === 'cursed')
  if (cursedCard) {
    // Pick a section that's NOT the attack target to seem less suspicious
    const otherSection = aliveSections.find(
      (s) => s.id !== (state.attackTarget ?? vulnerable.id),
    ) ?? aliveSections[0]
    return { cardId: cursedCard.id, targetSection: otherSection.id }
  }

  // Otherwise play a repair card on a healthy section (waste it)
  const repairCard = hand.find((c) => c.effect === 'repair')
  if (repairCard) {
    // Repair least-vulnerable section (least impact)
    const healthiest = [...aliveSections].sort((a, b) => b.hp - a.hp)[0]
    return { cardId: repairCard.id, targetSection: healthiest?.id ?? 'watchtower' }
  }

  return { cardId: hand[0].id, targetSection: aliveSections[0]?.id ?? 'watchtower' }
}

// ─── Decide whether traitor CPU should transform ──────────────────────────────

/**
 * Returns true if the traitor bot should transform this round.
 * Transforms when: captured, or round >= 5 and game state is favorable.
 */
export function shouldTransform(state: GameState, bot: Player): boolean {
  if (bot.isTransformed) return false

  // Transform immediately if captured (break free)
  if (bot.isCaptured) return true

  // Late game: transform when it's likely to be decisive
  if (state.round >= 5 && state.collapsedCount >= 1) return true
  if (state.round >= 6) return true

  // Transform if we have good attack cards
  const hasAttackCards = bot.hand.some((c) => ['breath', 'rampage', 'raid'].includes(c.effect))
  if (state.round >= 4 && hasAttackCards) return Math.random() < 0.4

  return false
}
