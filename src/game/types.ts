// Game phases
export type GamePhase =
  | 'lobby'
  | 'traitor-voting'
  | 'watchtower-reveal'
  | 'action'
  | 'immediate-effects'
  | 'marker-visualization'
  | 'enemy-attack'
  | 'draw'
  | 'game-over'

// Section IDs
export type SectionId = 'watchtower' | 'gate' | 'armory' | 'barracks'

// Card types
export type CardType = 'defense' | 'cursed' | 'transformation'

// Player roles
export type PlayerRole = 'defender' | 'traitor'

export interface Card {
  id: string
  name: string
  nameJa: string
  type: CardType
  description: string
  descriptionJa: string
  effect: string // key for game logic
}

export interface Marker {
  id: string
  placedByPlayerId: string
  type: 'damage' | 'cursed'
  cardEffect?: string // for cursed markers
  cardName?: string
}

export interface Section {
  id: SectionId
  name: string
  nameJa: string
  emoji: string
  hp: number
  maxHp: number
  isCollapsed: boolean
  markers: Marker[]
  bonusActive: boolean
  fortified: boolean // 防壁強化 active
  fortifyUsedThisRound: boolean
  repairDisabledNextRound: boolean // from 応急修復 cursed effect
  doubleDamageNextRound: boolean   // from 緊急封鎖 cursed effect
  repairNullifiedThisRound: boolean // from レイド
}

export interface PlayerAction {
  playerId: string
  card: Card
  targetSection: SectionId
}

export interface Player {
  id: string
  name: string
  role: PlayerRole
  preferredRole?: PlayerRole  // test: player-chosen role before game starts
  isTransformed: boolean
  isCaptured: boolean
  capturedTurnsLeft: number
  isStunned: boolean
  stunnedTurnsLeft: number
  hand: Card[]
  isReady: boolean
  isBot: boolean
  // Encourage state
  encouragedNextTurn: boolean  // draws 2 and plays 2 next turn
  playsThisTurn: number
  maxPlaysThisTurn: number
  // Conscription effect
  noCarryoverNextTurn: boolean
}

export interface GameState {
  roomId: string
  players: Player[]
  sections: Section[]
  round: number
  phase: GamePhase
  dawnCounter: number // counts down from 8
  collapsedCount: number
  attackTarget: SectionId | null
  traitorVotes: Record<string, SectionId> // traitorId -> sectionId
  traitorVotesSubmitted: string[] // traitor IDs who have voted
  playedCards: Record<string, PlayerAction> // playerId -> played card
  actionsSubmitted: string[] // player IDs who submitted action
  winner: 'defenders' | 'traitors' | null
  log: string[]
  // Watchtower reveal text
  watchtowerRevealTarget: SectionId | null
  // Deck
  deck: Card[]
  discardPile: Card[]
  // Phase timer (seconds remaining, -1 = no timer)
  phaseTimer: number
  // host
  hostId: string
  // Set when a player transforms (cleared next phase)
  transformAnnouncement: string | null
}

// What each player sees (server filters secrets)
export interface PlayerView {
  roomId: string
  myPlayer: Player
  players: PlayerPublicInfo[]
  sections: Section[]
  round: number
  phase: GamePhase
  dawnCounter: number
  collapsedCount: number
  attackTarget: SectionId | null // only revealed during watchtower-reveal or after
  traitorVotes: Record<string, SectionId> | null // only for traitors
  traitorAllies: string[] // IDs of fellow traitors (only for traitors)
  playedCards: Record<string, { card: Card; targetSection: SectionId }> // visible to all after action phase
  actionsSubmitted: string[] // who has submitted (no card info until revealed)
  winner: 'defenders' | 'traitors' | null
  log: string[]
  watchtowerRevealTarget: SectionId | null
  phaseTimer: number
  hostId: string
  traitorVotesSubmitted: string[]
  transformAnnouncement: string | null
}

export interface PlayerPublicInfo {
  id: string
  name: string
  isTransformed: boolean
  isCaptured: boolean
  capturedTurnsLeft: number
  isStunned: boolean
  stunnedTurnsLeft: number
  cardCount: number
  isReady: boolean
  isBot: boolean
  preferredRole?: PlayerRole
  playsThisTurn: number
  maxPlaysThisTurn: number
}

// Socket event payloads
export interface CreateRoomPayload {
  playerName: string
}

export interface JoinRoomPayload {
  roomId: string
  playerName: string
}

export interface StartGamePayload {
  roomId: string
}

export interface SubmitVotePayload {
  roomId: string
  targetSection: SectionId
}

export interface SubmitActionPayload {
  roomId: string
  cardId: string
  targetSection: SectionId
}

export interface TransformPayload {
  roomId: string
}

export interface PhaseAdvancePayload {
  roomId: string
}

// Room info for lobby
export interface RoomInfo {
  roomId: string
  playerCount: number
  maxPlayers: number
  hostName: string
  started: boolean
}

export interface AddCpuPayload {
  roomId: string
  count?: number
}
