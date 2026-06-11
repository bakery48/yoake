import {
  GameState,
  Player,
  Section,
  SectionId,
  PlayerRole,
  PlayerView,
  PlayerPublicInfo,
  PlayerAction,
  Card,
  Marker,
} from './types'
import { buildDeck, buildTransformationDeck, shuffle, TRANSFORMATION_CARDS } from './cards'

// ─── Constants ───────────────────────────────────────────────────────────────

export const SECTION_DEFS: Pick<Section, 'id' | 'name' | 'nameJa' | 'emoji' | 'maxHp'>[] = [
  { id: 'watchtower', name: 'Watchtower', nameJa: '見張り塔', emoji: '🗼', maxHp: 8 },
  { id: 'gate',       name: 'Gate',       nameJa: '城門',     emoji: '🚪', maxHp: 8 },
  { id: 'armory',     name: 'Armory',     nameJa: '武器庫',   emoji: '⚔️',  maxHp: 8 },
  { id: 'barracks',   name: 'Barracks',   nameJa: '兵舎',     emoji: '🏥', maxHp: 8 },
]

export const TRAITOR_COUNTS: Record<number, number> = {
  4: 1, 5: 2, 6: 2, 7: 2, 8: 3,
}

function baseEnemyDamage(round: number): number {
  if (round <= 3) return 2
  if (round <= 6) return 3
  return 4
}

function markerId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ─── Initialization ───────────────────────────────────────────────────────────

export function createInitialGameState(
  roomId: string,
  players: { id: string; name: string }[],
  hostId: string,
): GameState {
  const playerCount = players.length

  // Assign roles
  const traitorCount = TRAITOR_COUNTS[playerCount] ?? 1
  const indices = shuffle(Array.from({ length: playerCount }, (_, i) => i))
  const traitorIndices = new Set(indices.slice(0, traitorCount))

  const deck = buildDeck(playerCount)
  const transformDeck = buildTransformationDeck()

  // Deal 3 cards to each player
  let deckPos = 0
  const gamePlayers: Player[] = players.map((p, i) => {
    const hand = deck.slice(deckPos, deckPos + 3)
    deckPos += 3
    const role: PlayerRole = traitorIndices.has(i) ? 'traitor' : 'defender'
    return {
      id: p.id,
      name: p.name,
      role,
      isTransformed: false,
      isCaptured: false,
      capturedTurnsLeft: 0,
      isStunned: false,
      stunnedTurnsLeft: 0,
      hand,
      isReady: false,
      isBot: (p as { id: string; name: string; isBot?: boolean }).isBot ?? false,
      encouragedNextTurn: false,
      playsThisTurn: 1,
      maxPlaysThisTurn: 1,
      noCarryoverNextTurn: false,
    }
  })

  const sections: Section[] = SECTION_DEFS.map((def) => ({
    ...def,
    hp: def.maxHp,
    isCollapsed: false,
    markers: [],
    bonusActive: true,
    fortified: false,
    fortifyUsedThisRound: false,
    repairDisabledNextRound: false,
    doubleDamageNextRound: false,
    repairNullifiedThisRound: false,
  }))

  return {
    roomId,
    players: gamePlayers,
    sections,
    round: 1,
    phase: 'traitor-voting',
    dawnCounter: 8,
    collapsedCount: 0,
    attackTarget: null,
    traitorVotes: {},
    traitorVotesSubmitted: [],
    playedCards: {},
    actionsSubmitted: [],
    winner: null,
    log: ['ゲーム開始！夜が明けるまで砦を守れ。', `ラウンド1開始。裏切り者の投票フェーズ。`],
    watchtowerRevealTarget: null,
    deck: deck.slice(deckPos),
    discardPile: [],
    phaseTimer: -1,
    hostId,
  }
}

// ─── View Filtering ───────────────────────────────────────────────────────────

export function buildPlayerView(state: GameState, playerId: string): PlayerView {
  const me = state.players.find((p) => p.id === playerId)!
  const isTraitor = me.role === 'traitor'
  const traitorAllies = isTraitor
    ? state.players.filter((p) => p.role === 'traitor' && p.id !== playerId).map((p) => p.id)
    : []

  const publicPlayers: PlayerPublicInfo[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isTransformed: p.isTransformed,
    isCaptured: p.isCaptured,
    capturedTurnsLeft: p.capturedTurnsLeft,
    isStunned: p.isStunned,
    stunnedTurnsLeft: p.stunnedTurnsLeft,
    cardCount: p.hand.length,
    isReady: p.isReady,
    isBot: p.isBot,
    playsThisTurn: p.playsThisTurn,
    maxPlaysThisTurn: p.maxPlaysThisTurn,
  }))

  // Attack target is only revealed during/after watchtower-reveal phase, or at enemy-attack
  const revealAttackTarget =
    state.phase === 'watchtower-reveal' ||
    state.phase === 'immediate-effects' ||
    state.phase === 'marker-visualization' ||
    state.phase === 'enemy-attack' ||
    state.phase === 'draw' ||
    state.phase === 'game-over' ||
    isTraitor

  // Played cards visible during immediate-effects onwards
  const revealPlayedCards =
    state.phase === 'immediate-effects' ||
    state.phase === 'marker-visualization' ||
    state.phase === 'enemy-attack' ||
    state.phase === 'draw' ||
    state.phase === 'game-over'

  const playedCardsView = revealPlayedCards
    ? Object.fromEntries(
        Object.entries(state.playedCards).map(([pid, action]) => [
          pid,
          { card: action.card, targetSection: action.targetSection },
        ]),
      )
    : {}

  return {
    roomId: state.roomId,
    myPlayer: me,
    players: publicPlayers,
    sections: state.sections,
    round: state.round,
    phase: state.phase,
    dawnCounter: state.dawnCounter,
    collapsedCount: state.collapsedCount,
    attackTarget: revealAttackTarget ? state.attackTarget : null,
    traitorVotes: isTraitor ? state.traitorVotes : null,
    traitorAllies,
    playedCards: playedCardsView,
    actionsSubmitted: state.actionsSubmitted,
    winner: state.winner,
    log: state.log,
    watchtowerRevealTarget: state.watchtowerRevealTarget,
    phaseTimer: state.phaseTimer,
    hostId: state.hostId,
    traitorVotesSubmitted: state.traitorVotesSubmitted,
  }
}

// ─── Phase Transitions ────────────────────────────────────────────────────────

/** Submit a traitor vote. Returns updated state, and whether all traitors voted. */
export function submitTraitorVote(
  state: GameState,
  playerId: string,
  targetSection: SectionId,
): { state: GameState; allVoted: boolean } {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.role !== 'traitor') return { state, allVoted: false }

  const traitors = state.players.filter((p) => p.role === 'traitor')
  const newVotes = { ...state.traitorVotes, [playerId]: targetSection }
  const submittedSet = new Set(state.traitorVotesSubmitted)
  submittedSet.add(playerId)
  const submitted = Array.from(submittedSet)

  // Latent traitors also place a damage marker on the voted section
  const newMarker: Marker = {
    id: markerId(),
    placedByPlayerId: playerId,
    type: 'damage',
  }
  const newSections = state.sections.map((s) =>
    s.id === targetSection ? { ...s, markers: [...s.markers, newMarker] } : s,
  )

  const newState: GameState = {
    ...state,
    traitorVotes: newVotes,
    traitorVotesSubmitted: submitted,
    sections: newSections,
    log: [...state.log, `裏切り者が密かに投票しました`],
  }

  const allVoted = submitted.length === traitors.length
  return { state: newState, allVoted }
}

/** Resolve traitor votes and advance to watchtower-reveal or action phase */
export function resolveTraitorVoting(state: GameState): GameState {
  // Majority vote
  const tally: Record<string, number> = {}
  for (const section of Object.values(state.traitorVotes)) {
    tally[section] = (tally[section] ?? 0) + 1
  }

  let attackTarget: SectionId = 'gate' // default
  let maxVotes = 0
  for (const [section, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count
      attackTarget = section as SectionId
    }
  }

  // If no votes, pick random non-collapsed section
  if (maxVotes === 0) {
    const alive = state.sections.filter((s) => !s.isCollapsed)
    attackTarget = alive[Math.floor(Math.random() * alive.length)]?.id ?? 'gate'
  }

  const watchtower = state.sections.find((s) => s.id === 'watchtower')!
  const watchtowerAtMax = watchtower.hp >= watchtower.maxHp && !watchtower.isCollapsed

  const nextPhase = watchtowerAtMax ? 'watchtower-reveal' : 'action'

  return {
    ...state,
    attackTarget,
    watchtowerRevealTarget: watchtowerAtMax ? attackTarget : null,
    phase: nextPhase,
    log: [
      ...state.log,
      watchtowerAtMax
        ? `🗼 見張り塔の力が輝く！敵の攻撃目標が明かされる。`
        : `裏切り者の投票が確定しました。`,
    ],
  }
}

/** Advance from watchtower-reveal to action phase */
export function advanceFromWatchtowerReveal(state: GameState): GameState {
  return {
    ...state,
    phase: 'action',
    log: [...state.log, `行動フェーズ開始。全員カードを選択してください。`],
  }
}

/** Submit a player's action card */
export function submitPlayerAction(
  state: GameState,
  playerId: string,
  cardId: string,
  targetSection: SectionId,
): { state: GameState; allSubmitted: boolean } {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return { state, allSubmitted: false }

  const card = player.hand.find((c) => c.id === cardId)
  if (!card) return { state, allSubmitted: false }

  // Check captured/stunned restrictions
  if ((player.isCaptured || player.isStunned)) {
    const allowed = ['capture', 'release', 'escape', 'forced_release']
    if (!allowed.includes(card.effect)) {
      return { state, allSubmitted: false }
    }
  }

  // Check transformation card restriction
  if (card.type === 'transformation' && !player.isTransformed) {
    return { state, allSubmitted: false }
  }

  const newHand = player.hand.filter((c) => c.id !== cardId)
  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, hand: newHand, isReady: true } : p,
  )

  const action: PlayerAction = { playerId, card, targetSection }
  const newPlayedCards = { ...state.playedCards, [playerId]: action }
  const submittedSet2 = new Set(state.actionsSubmitted)
  submittedSet2.add(playerId)
  const submitted = Array.from(submittedSet2)

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    playedCards: newPlayedCards,
    actionsSubmitted: submitted,
    log: [...state.log, `${player.name} がカードを選択しました`],
  }

  // Check if all active players submitted
  const activePlayers = state.players.filter((p) => !p.isCaptured && !p.isStunned)
  const allSubmitted = activePlayers.every((p) => submitted.includes(p.id))

  // Also treat captured/stunned as auto-submitted (they skip)
  const capturedIds = state.players.filter((p) => (p.isCaptured || p.isStunned) && !submitted.includes(p.id)).map(p => p.id)
  const effectiveSubmitted = [...submitted, ...capturedIds]
  const allEffective = state.players.every((p) => effectiveSubmitted.includes(p.id))

  return { state: newState, allSubmitted: allEffective }
}

/** Resolve immediate effects of all played cards */
export function resolveImmediateEffects(state: GameState): GameState {
  let s = { ...state, sections: state.sections.map(sec => ({ ...sec })) }
  s.players = s.players.map(p => ({ ...p }))

  const log: string[] = [...s.log]

  // Reset raid nullification from last round
  s.sections = s.sections.map(sec => ({ ...sec, repairNullifiedThisRound: false }))

  // Process raid cards first (affects other card resolution)
  for (const action of Object.values(s.playedCards)) {
    if (action.card.effect === 'raid') {
      s.sections = s.sections.map(sec =>
        sec.id === action.targetSection ? { ...sec, repairNullifiedThisRound: true } : sec,
      )
      const secName = s.sections.find(sec => sec.id === action.targetSection)?.nameJa ?? action.targetSection
      log.push(`⚔️ ${getPlayerName(s, action.playerId)} がレイドを発動！${secName}への修復が無効化される`)
    }
  }

  for (const action of Object.values(s.playedCards)) {
    const { card, targetSection, playerId } = action
    const playerName = getPlayerName(s, playerId)
    const secDef = s.sections.find(sec => sec.id === targetSection)
    if (!secDef || secDef.isCollapsed) continue

    switch (card.effect) {
      case 'repair': {
        if (secDef.repairDisabledNextRound || secDef.repairNullifiedThisRound) {
          log.push(`🚫 ${playerName} の修復は無効化されています`)
          break
        }
        // Armory bonus
        const armory = s.sections.find(s => s.id === 'armory')!
        const bonus = (armory.bonusActive && !armory.isCollapsed) ? 1 : 0
        const heal = 2 + bonus
        s.sections = s.sections.map(sec =>
          sec.id === targetSection
            ? { ...sec, hp: Math.min(sec.hp + heal, sec.maxHp) }
            : sec,
        )
        log.push(`🔧 ${playerName} が ${secDef.nameJa} を修復 (+${heal}HP)`)
        break
      }
      case 'fortify': {
        s.sections = s.sections.map(sec =>
          sec.id === targetSection ? { ...sec, fortified: true } : sec,
        )
        log.push(`🛡️ ${playerName} が ${secDef.nameJa} を強化した（次のダメージ半減）`)
        break
      }
      case 'scout': {
        // Scout effect is handled client-side with a special event; just log here
        log.push(`🔍 ${playerName} が偵察を使用（別のプレイヤーの手札を確認）`)
        break
      }
      case 'encourage': {
        s.players = s.players.map(p =>
          p.id === targetSection // targetSection is misused here — actually it's a player target
            ? p
            : p,
        )
        // Encourage targets a player; we store targetSection as playerId for this card
        const encourageTargetId = (action as any).targetPlayerId as string | undefined
        const encourageTarget = s.players.find(p => p.id === (encourageTargetId ?? targetSection))
        if (encourageTarget) {
          s.players = s.players.map(p =>
            p.id === encourageTarget.id ? { ...p, encouragedNextTurn: true } : p,
          )
          log.push(`💪 ${playerName} が ${encourageTarget.name} を激励した（次ターン2枚プレイ可能）`)
        }
        break
      }
      case 'capture': {
        const captureTargetId = (action as any).targetPlayerId as string | undefined
        const targetPlayer = s.players.find(p => p.id === (captureTargetId ?? targetSection))
        if (targetPlayer && !targetPlayer.isTransformed) {
          // Check invisible
          const invisAction = Object.values(s.playedCards).find(
            a => a.playerId === targetPlayer.id && a.card.effect === 'invisible',
          )
          if (invisAction) {
            log.push(`🫥 ${targetPlayer.name} はインビジブル中のため捕縛できない`)
          } else {
            s.players = s.players.map(p =>
              p.id === targetPlayer.id
                ? { ...p, isCaptured: true, capturedTurnsLeft: 3 }
                : p,
            )
            log.push(`⛓️ ${playerName} が ${targetPlayer.name} を捕縛した（3ターン）`)
          }
        }
        break
      }
      case 'release': {
        // targetSection here is used as "release mode" — we just release the first captured
        const capturedPlayer = s.players.find(p => p.isCaptured)
        if (capturedPlayer) {
          s.players = s.players.map(p =>
            p.id === capturedPlayer.id ? { ...p, isCaptured: false, capturedTurnsLeft: 0 } : p,
          )
          log.push(`🔓 ${playerName} が ${capturedPlayer.name} を解放した`)
        } else {
          // Remove first marker on target section
          s.sections = s.sections.map(sec =>
            sec.id === targetSection && sec.markers.length > 0
              ? { ...sec, markers: sec.markers.slice(1) }
              : sec,
          )
          log.push(`🔓 ${playerName} がマーカーを除去した`)
        }
        break
      }
      // Cursed cards
      case 'emergency_repair': {
        if (secDef.repairNullifiedThisRound) {
          log.push(`🚫 ${playerName} の応急修復は無効化されています`)
          break
        }
        s.sections = s.sections.map(sec =>
          sec.id === targetSection
            ? { ...sec, hp: Math.min(sec.hp + 3, sec.maxHp), repairDisabledNextRound: true }
            : sec,
        )
        log.push(`⚠️ ${playerName} が ${secDef.nameJa} に応急修復（+3HP、次ターン修復不可）`)
        break
      }
      case 'emergency_lockdown': {
        // Mark the section — handled in enemy attack phase
        s.sections = s.sections.map(sec =>
          sec.id === targetSection ? { ...sec, doubleDamageNextRound: true } : sec,
        )
        log.push(`⚠️ ${playerName} が緊急封鎖！今ラウンドの敵ダメージ=0（次ラウンド×2）`)
        break
      }
      case 'conscription': {
        // Already handled at draw: player drew extra cards; flag noCarryover
        s.players = s.players.map(p =>
          p.id === playerId ? { ...p, noCarryoverNextTurn: true } : p,
        )
        log.push(`⚠️ ${playerName} が徴用令を使用（次ターン持ち越し0）`)
        break
      }
      case 'forced_release': {
        const capturedPlayer = s.players.find(p => p.isCaptured)
        if (capturedPlayer && capturedPlayer.hand.length > 0) {
          const idx = Math.floor(Math.random() * capturedPlayer.hand.length)
          const discarded = capturedPlayer.hand[idx]
          s.players = s.players.map(p =>
            p.id === capturedPlayer.id
              ? {
                  ...p,
                  isCaptured: false,
                  capturedTurnsLeft: 0,
                  hand: p.hand.filter((_, i) => i !== idx),
                }
              : p,
          )
          s.discardPile = [...s.discardPile, discarded]
          log.push(`⚠️ ${playerName} が力任せの解放！${capturedPlayer.name} を解放（手札1枚ランダム捨て）`)
        }
        break
      }
      // Transformation cards
      case 'breath': {
        s.sections = s.sections.map(sec =>
          sec.id === targetSection ? { ...sec, hp: Math.max(0, sec.hp - 3) } : sec,
        )
        log.push(`💨 ${playerName} がブレスを発動！${secDef.nameJa} -3HP`)
        break
      }
      case 'crack': {
        s.sections = s.sections.map(sec =>
          sec.id === targetSection
            ? { ...sec, maxHp: Math.max(1, sec.maxHp - 1), hp: Math.min(sec.hp, sec.maxHp - 1) }
            : sec,
        )
        log.push(`💥 ${playerName} がクラックを発動！${secDef.nameJa} の最大HP永続-1`)
        break
      }
      case 'stun': {
        const stunTargetId = (action as any).targetPlayerId as string | undefined
        const targetPlayer = s.players.find(p => p.id === (stunTargetId ?? ''))
        if (targetPlayer && !targetPlayer.isTransformed) {
          s.players = s.players.map(p =>
            p.id === targetPlayer.id ? { ...p, isStunned: true, stunnedTurnsLeft: 1 } : p,
          )
          log.push(`⚡ ${playerName} がスタン！${targetPlayer.name} を1ターン制限`)
        }
        break
      }
      case 'rampage': {
        // Flag on game state - handled in enemy attack phase
        ;(s as any)._rampageActive = true
        log.push(`🔥 ${playerName} がランページ！今ラウンドの敵ダメージ×1.5`)
        break
      }
      case 'escape': {
        const capturedPlayer = s.players.find(p => p.isCaptured && p.id !== playerId)
        if (capturedPlayer) {
          s.players = s.players.map(p =>
            p.id === capturedPlayer.id ? { ...p, isCaptured: false, capturedTurnsLeft: 0 } : p,
          )
          log.push(`🏃 ${playerName} がエスケープ！${capturedPlayer.name} を解放`)
        }
        break
      }
      case 'invisible': {
        log.push(`🫥 ${playerName} がインビジブル（このターン捕縛不可）`)
        break
      }
    }
  }

  // Update section bonus states
  s.sections = s.sections.map(sec => ({
    ...sec,
    bonusActive: sec.hp >= sec.maxHp && !sec.isCollapsed,
    isCollapsed: sec.hp <= 0,
  }))

  s.log = log

  return { ...s, phase: 'marker-visualization' }
}

/** Move to marker visualization */
export function resolveMarkerVisualization(state: GameState): GameState {
  return {
    ...state,
    phase: 'enemy-attack',
    log: [...state.log, `⚔️ 敵の攻撃フェーズ！`],
  }
}

/** Resolve enemy attack */
export function resolveEnemyAttack(state: GameState): GameState {
  if (!state.attackTarget) return { ...state, phase: 'draw' }

  const target = state.sections.find((s) => s.id === state.attackTarget)
  if (!target || target.isCollapsed) {
    // Find next alive section
    const alive = state.sections.filter((s) => !s.isCollapsed)
    if (alive.length === 0) return { ...state, phase: 'draw' }
  }

  let damage = baseEnemyDamage(state.round)

  // Add damage markers
  const targetSec = state.sections.find((s) => s.id === state.attackTarget)!
  const damageMarkers = targetSec.markers.filter((m) => m.type === 'damage').length
  damage += damageMarkers

  // Emergency lockdown: damage = 0
  const lockdownActive = Object.values(state.playedCards).some(
    (a) => a.card.effect === 'emergency_lockdown' && a.targetSection === state.attackTarget,
  )
  if (lockdownActive) {
    damage = 0
  }

  // Rampage: ×1.5
  const rampageActive = (state as any)._rampageActive
  if (rampageActive && !lockdownActive) {
    damage = Math.floor(damage * 1.5)
  }

  // Gate bonus: -1 if Gate is at max HP
  const gate = state.sections.find((s) => s.id === 'gate')!
  if (gate.bonusActive && !gate.isCollapsed) {
    damage = Math.max(0, damage - 1)
  }

  // Fortify: halve
  if (targetSec.fortified) {
    damage = Math.floor(damage / 2)
  }

  // Double damage next round (緊急封鎖 penalty) — check if it was set LAST round
  if (targetSec.doubleDamageNextRound) {
    damage = damage * 2
  }

  const log = [...state.log, `⚔️ 敵が ${targetSec.nameJa} を攻撃！ダメージ: ${damage}`]

  // Apply damage
  const newHp = Math.max(0, targetSec.hp - damage)
  const collapsed = newHp <= 0

  if (collapsed) {
    log.push(`💀 ${targetSec.nameJa} が崩壊した！`)
  }

  // Clear damage markers on attacked section
  let sections = state.sections.map((sec) => {
    if (sec.id === state.attackTarget) {
      return {
        ...sec,
        hp: newHp,
        isCollapsed: collapsed,
        markers: sec.markers.filter((m) => m.type !== 'damage'),
        fortified: false,
        fortifyUsedThisRound: false,
        doubleDamageNextRound: false,
        bonusActive: newHp >= sec.maxHp && !collapsed,
      }
    }
    // Clear doubleDamageNextRound on all sections that were set this round
    return sec
  })

  // Barracks bonus: auto HP+2 to lowest HP section
  const barracks = sections.find((s) => s.id === 'barracks')!
  if (barracks.bonusActive && !barracks.isCollapsed) {
    const alive = sections.filter((s) => !s.isCollapsed).sort((a, b) => a.hp - b.hp)
    if (alive.length > 0) {
      const lowestId = alive[0].id
      sections = sections.map((sec) =>
        sec.id === lowestId
          ? { ...sec, hp: Math.min(sec.hp + 2, sec.maxHp), bonusActive: (sec.hp + 2) >= sec.maxHp }
          : sec,
      )
      log.push(`🏥 兵舎ボーナス：${sections.find(s => s.id === lowestId)?.nameJa} +2HP`)
    }
    // Barracks also gives HP+1 to any section — auto-apply to second lowest
    const alive2 = sections.filter((s) => !s.isCollapsed).sort((a, b) => a.hp - b.hp)
    if (alive2.length > 1) {
      const secId = alive2[1].id
      sections = sections.map((sec) =>
        sec.id === secId
          ? { ...sec, hp: Math.min(sec.hp + 1, sec.maxHp), bonusActive: (sec.hp + 1) >= sec.maxHp }
          : sec,
      )
    }
  }

  const collapsedCount = sections.filter((s) => s.isCollapsed).length

  // Check win condition
  let winner: GameState['winner'] = null
  if (collapsedCount >= 2) {
    winner = 'traitors'
    log.push(`🌑 裏切り者の勝利！2つのセクションが崩壊した。`)
  } else if (state.round >= 8 && state.dawnCounter <= 1) {
    winner = 'defenders'
    log.push(`🌅 防衛者の勝利！夜明けまで砦を守り切った！`)
  }

  return {
    ...state,
    sections,
    collapsedCount,
    winner,
    log,
    phase: winner ? 'game-over' : 'draw',
    _rampageActive: undefined,
  } as GameState
}

/** Draw phase: give each player 1 card (or 2 if Armory MAX), apply carryover limits */
export function resolveDraw(state: GameState): GameState {
  let deck = [...state.deck]
  let discard = [...state.discardPile]
  const log = [...state.log]

  // Reset repair-disabled flags (set last round)
  let sections = state.sections.map((sec) => ({
    ...sec,
    repairDisabledNextRound: false,
  }))

  const armory = sections.find((s) => s.id === 'armory')!
  const armoryBonus = armory.bonusActive && !armory.isCollapsed

  function drawCard(): Card | null {
    if (deck.length === 0) {
      if (discard.length === 0) return null
      deck = shuffle(discard)
      discard = []
      log.push(`🃏 デッキを補充しました`)
    }
    return deck.shift() ?? null
  }

  const players = state.players.map((p) => {
    // Carryover limit
    const carryoverLimit = p.noCarryoverNextTurn ? 0 : armoryBonus ? 2 : 1
    const keptCards = p.hand.slice(0, carryoverLimit)
    discard.push(...p.hand.slice(carryoverLimit))

    // Draw 1 card (captured/stunned players still draw)
    const drawCount = p.encouragedNextTurn ? 2 : 1
    const drawn: Card[] = []
    for (let i = 0; i < drawCount; i++) {
      const card = drawCard()
      if (card) drawn.push(card)
    }

    // Encouraged: plays 2 next turn
    const maxPlays = p.encouragedNextTurn ? 2 : 1

    // Decrement capture/stun timers
    const newCapturedTurns = Math.max(0, p.capturedTurnsLeft - 1)
    const newStunnedTurns = Math.max(0, p.stunnedTurnsLeft - 1)

    return {
      ...p,
      hand: [...keptCards, ...drawn],
      isCaptured: newCapturedTurns > 0,
      capturedTurnsLeft: newCapturedTurns,
      isStunned: newStunnedTurns > 0,
      stunnedTurnsLeft: newStunnedTurns,
      isReady: false,
      encouragedNextTurn: false,
      playsThisTurn: 1,
      maxPlaysThisTurn: maxPlays,
      noCarryoverNextTurn: false,
    }
  })

  const newRound = state.round + 1
  const newDawnCounter = state.dawnCounter - 1

  // Check if dawn reached
  let winner = state.winner
  if (newDawnCounter <= 0 && !winner) {
    winner = 'defenders'
    log.push(`🌅 夜明け！防衛者の勝利！`)
  }

  // Reset section repairDisabled (was set for sections hit by emergency_repair last round)
  // Actually handled per-section during immediate effects

  log.push(`ラウンド${newRound}開始。裏切り者の投票フェーズ。`)

  return {
    ...state,
    players,
    sections,
    round: newRound,
    dawnCounter: newDawnCounter,
    phase: winner ? 'game-over' : 'traitor-voting',
    winner,
    traitorVotes: {},
    traitorVotesSubmitted: [],
    playedCards: {},
    actionsSubmitted: [],
    attackTarget: null,
    watchtowerRevealTarget: null,
    deck,
    discardPile: discard,
    log,
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

export function transformPlayer(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.role !== 'traitor' || player.isTransformed) return state

  // Give transformation cards (replace hand with transformation cards)
  const transformCards = buildTransformationDeck().slice(0, 4)

  const players = state.players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          isTransformed: true,
          isCaptured: false,
          capturedTurnsLeft: 0,
          hand: transformCards,
        }
      : p,
  )

  return {
    ...state,
    players,
    log: [...state.log, `💀 ${player.name} が変身した！`],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayerName(state: GameState, playerId: string): string {
  return state.players.find((p) => p.id === playerId)?.name ?? playerId
}

export function getTraitorCount(playerCount: number): number {
  return TRAITOR_COUNTS[playerCount] ?? 1
}
