import { Server, Socket } from 'socket.io'
import {
  GameState,
  Player,
  SectionId,
  RoomInfo,
} from './types'
import {
  createInitialGameState,
  buildPlayerView,
  submitTraitorVote,
  resolveTraitorVoting,
  advanceFromWatchtowerReveal,
  submitPlayerAction,
  autoSkipPlayer,
  resolveImmediateEffects,
  resolveMarkerVisualization,
  resolveEnemyAttack,
  resolveDraw,
  transformPlayer,
} from './gameLogic'
import {
  defenderCpuAction,
  traitorCpuAction,
  traitorCpuVote,
  traitorCpuMarkerTarget,
  shouldTransform,
} from './cpuAI'

// In-memory storage
const rooms = new Map<string, GameState>()
const lobbyPlayers = new Map<string, { id: string; name: string; roomId: string }>()

let cpuCounter = 0
function newCpuId(): string {
  return `cpu_${++cpuCounter}_${Date.now()}`
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function broadcastGameState(io: Server, state: GameState) {
  for (const player of state.players) {
    if (player.isBot) continue
    const view = buildPlayerView(state, player.id)
    io.to(player.id).emit('game:state', view)
  }
}

function broadcastRoomList(io: Server) {
  const list: RoomInfo[] = []
  rooms.forEach((state, roomId) => {
    if (state.phase === 'lobby') {
      list.push({
        roomId,
        playerCount: state.players.length,
        maxPlayers: 8,
        hostName: state.players.find((p: Player) => p.id === state.hostId)?.name ?? '?',
        started: false,
      })
    }
  })
  io.emit('lobby:rooms', list)
}

function schedulePhaseAdvance(io: Server, roomId: string, delayMs: number, fn: () => void) {
  setTimeout(() => {
    const state = rooms.get(roomId)
    if (!state) return
    fn()
  }, delayMs)
}

// ─── CPU Auto-actions ──────────────────────────────────────────────────────────

function triggerCpuVotes(io: Server, roomId: string) {
  const state = rooms.get(roomId)
  if (!state || state.phase !== 'traitor-voting') return

  const pendingBots = state.players.filter(
    (p) => p.isBot && p.role === 'traitor' && !state.traitorVotesSubmitted.includes(p.id),
  )
  if (pendingBots.length === 0) return

  let current = state
  for (const bot of pendingBots) {
    const vote = traitorCpuVote(current, bot)
    const { state: next, allVoted } = submitTraitorVote(current, bot.id, vote)
    current = next
    if (allVoted) {
      rooms.set(roomId, current)
      broadcastGameState(io, current)
      schedulePhaseAdvance(io, roomId, 500, () => {
        const s = rooms.get(roomId)!
        const resolved = resolveTraitorVoting(s)
        rooms.set(roomId, resolved)
        broadcastGameState(io, resolved)
        if (resolved.phase === 'watchtower-reveal') {
          schedulePhaseAdvance(io, roomId, 4000, () => {
            const s2 = rooms.get(roomId)!
            if (s2.phase !== 'watchtower-reveal') return
            const advanced = advanceFromWatchtowerReveal(s2)
            rooms.set(roomId, advanced)
            broadcastGameState(io, advanced)
            triggerCpuActions(io, roomId)
          })
        } else {
          triggerCpuActions(io, roomId)
        }
      })
      return
    }
  }
  rooms.set(roomId, current)
  broadcastGameState(io, current)
}

function triggerCpuActions(io: Server, roomId: string) {
  const state = rooms.get(roomId)
  if (!state || state.phase !== 'action') return

  const pendingBots = state.players.filter(
    (p) => p.isBot && !state.actionsSubmitted.includes(p.id),
  )
  if (pendingBots.length === 0) return

  // Stagger CPU actions slightly for a more natural feel
  pendingBots.forEach((bot, idx) => {
    schedulePhaseAdvance(io, roomId, 400 + idx * 300, () => {
      const s = rooms.get(roomId)
      if (!s || s.phase !== 'action') return
      const currentBot = s.players.find((p) => p.id === bot.id)
      if (!currentBot || s.actionsSubmitted.includes(bot.id)) return

      // Check if bot should transform before acting
      if (currentBot.role === 'traitor' && !currentBot.isTransformed && shouldTransform(s, currentBot)) {
        const transformed = transformPlayer(s, bot.id)
        rooms.set(roomId, transformed)
        broadcastGameState(io, transformed)
        // Re-read state after transform and submit action
        const s2 = rooms.get(roomId)!
        const updatedBot = s2.players.find((p) => p.id === bot.id)!
        const action = traitorCpuAction(s2, updatedBot)
        const { state: afterAction, allSubmitted } = action.cardId
          ? submitPlayerAction(s2, bot.id, action.cardId, action.targetSection)
          : autoSkipPlayer(s2, bot.id)
        rooms.set(roomId, afterAction)
        broadcastGameState(io, afterAction)
        if (allSubmitted) resolveAfterAllActions(io, roomId)
        return
      }

      const action =
        currentBot.role === 'traitor'
          ? traitorCpuAction(s, currentBot)
          : defenderCpuAction(s, currentBot)

      const { state: afterAction, allSubmitted } = action.cardId
        ? submitPlayerAction(s, bot.id, action.cardId, action.targetSection)
        : autoSkipPlayer(s, bot.id)
      rooms.set(roomId, afterAction)
      broadcastGameState(io, afterAction)
      if (allSubmitted) resolveAfterAllActions(io, roomId)
    })
  })
}

function resolveAfterAllActions(io: Server, roomId: string) {
  schedulePhaseAdvance(io, roomId, 800, () => {
    const s = rooms.get(roomId)!
    if (s.phase !== 'action') return
    const afterEffects = resolveImmediateEffects(s)
    rooms.set(roomId, afterEffects)
    broadcastGameState(io, afterEffects)

    schedulePhaseAdvance(io, roomId, 3000, () => {
      const s2 = rooms.get(roomId)!
      if (s2.phase !== 'marker-visualization') return
      const afterMarkers = resolveMarkerVisualization(s2)
      rooms.set(roomId, afterMarkers)
      broadcastGameState(io, afterMarkers)

      schedulePhaseAdvance(io, roomId, 3000, () => {
        const s3 = rooms.get(roomId)!
        if (s3.phase !== 'enemy-attack') return
        const afterAttack = resolveEnemyAttack(s3)
        rooms.set(roomId, afterAttack)
        broadcastGameState(io, afterAttack)

        if (afterAttack.phase === 'game-over') return

        schedulePhaseAdvance(io, roomId, 3000, () => {
          const s4 = rooms.get(roomId)!
          if (s4.phase !== 'draw') return
          const afterDraw = resolveDraw(s4)
          rooms.set(roomId, afterDraw)
          broadcastGameState(io, afterDraw)
          // Start next round CPU votes
          if (afterDraw.phase === 'traitor-voting') {
            schedulePhaseAdvance(io, roomId, 800, () => triggerCpuVotes(io, roomId))
          }
        })
      })
    })
  })
}

// ─── Socket event handlers ────────────────────────────────────────────────────

export function registerSocketHandlers(io: Server, socket: Socket) {
  const { id: socketId } = socket

  socket.on('lobby:create', (payload: { playerName: string }) => {
    let roomId = generateRoomCode()
    while (rooms.has(roomId)) roomId = generateRoomCode()

    const state: GameState = {
      roomId,
      players: [
        {
          id: socketId,
          name: payload.playerName,
          role: 'defender',
          isTransformed: false,
          isCaptured: false,
          capturedTurnsLeft: 0,
          isStunned: false,
          stunnedTurnsLeft: 0,
          hand: [],
          isReady: false,
          isBot: false,
          encouragedNextTurn: false,
          playsThisTurn: 1,
          maxPlaysThisTurn: 1,
          noCarryoverNextTurn: false,
        },
      ],
      sections: [],
      round: 0,
      phase: 'lobby',
      dawnCounter: 8,
      collapsedCount: 0,
      attackTarget: null,
      traitorVotes: {},
      traitorVotesSubmitted: [],
      playedCards: {},
      actionsSubmitted: [],
      winner: null,
      log: [`${payload.playerName} がルームを作成しました`],
      watchtowerRevealTarget: null,
      deck: [],
      discardPile: [],
      phaseTimer: -1,
      hostId: socketId,
    }

    rooms.set(roomId, state)
    lobbyPlayers.set(socketId, { id: socketId, name: payload.playerName, roomId })
    socket.join(roomId)
    socket.emit('lobby:created', { roomId })
    broadcastGameState(io, state)
    broadcastRoomList(io)
  })

  socket.on('lobby:join', (payload: { roomId: string; playerName: string }) => {
    const { roomId, playerName } = payload
    const state = rooms.get(roomId.toUpperCase())
    if (!state) {
      socket.emit('error', { message: 'ルームが見つかりません' })
      return
    }
    if (state.phase !== 'lobby') {
      socket.emit('error', { message: 'ゲームはすでに開始しています' })
      return
    }
    if (state.players.length >= 8) {
      socket.emit('error', { message: 'ルームが満員です' })
      return
    }

    const newPlayer: Player = {
      id: socketId,
      name: playerName,
      role: 'defender',
      isTransformed: false,
      isCaptured: false,
      capturedTurnsLeft: 0,
      isStunned: false,
      stunnedTurnsLeft: 0,
      hand: [],
      isReady: false,
      isBot: false,
      encouragedNextTurn: false,
      playsThisTurn: 1,
      maxPlaysThisTurn: 1,
      noCarryoverNextTurn: false,
    }

    const newState: GameState = {
      ...state,
      players: [...state.players, newPlayer],
      log: [...state.log, `${playerName} がルームに参加しました`],
    }

    rooms.set(roomId.toUpperCase(), newState)
    lobbyPlayers.set(socketId, { id: socketId, name: playerName, roomId: roomId.toUpperCase() })
    socket.join(roomId.toUpperCase())
    socket.emit('lobby:joined', { roomId: roomId.toUpperCase() })
    broadcastGameState(io, newState)
    broadcastRoomList(io)
  })

  // Add CPU players to the room
  socket.on('lobby:add_cpu', (payload: { roomId: string; count?: number }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.hostId !== socketId || state.phase !== 'lobby') return

    const toAdd = Math.min(payload.count ?? 1, 8 - state.players.length)
    if (toAdd <= 0) return

    const cpuNames = ['CPU-アルファ', 'CPU-ベータ', 'CPU-ガンマ', 'CPU-デルタ', 'CPU-イプシロン', 'CPU-ゼータ', 'CPU-イータ']
    const existingCpuCount = state.players.filter((p) => p.isBot).length

    const newCpus: Player[] = Array.from({ length: toAdd }, (_, i) => ({
      id: newCpuId(),
      name: cpuNames[(existingCpuCount + i) % cpuNames.length],
      role: 'defender' as const,
      isTransformed: false,
      isCaptured: false,
      capturedTurnsLeft: 0,
      isStunned: false,
      stunnedTurnsLeft: 0,
      hand: [],
      isReady: false,
      isBot: true,
      encouragedNextTurn: false,
      playsThisTurn: 1,
      maxPlaysThisTurn: 1,
      noCarryoverNextTurn: false,
    }))

    const newState: GameState = {
      ...state,
      players: [...state.players, ...newCpus],
      log: [...state.log, `CPU ${toAdd}人 を追加しました`],
    }
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
    broadcastRoomList(io)
  })

  // Remove a CPU player from the room
  socket.on('lobby:remove_cpu', (payload: { roomId: string; cpuId: string }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.hostId !== socketId || state.phase !== 'lobby') return

    const cpu = state.players.find((p) => p.id === payload.cpuId && p.isBot)
    if (!cpu) return

    const newState: GameState = {
      ...state,
      players: state.players.filter((p) => p.id !== payload.cpuId),
      log: [...state.log, `${cpu.name} を削除しました`],
    }
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
    broadcastRoomList(io)
  })

  socket.on('lobby:set_role', (payload: { roomId: string; role: 'defender' | 'traitor' | null }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.phase !== 'lobby') return
    const newState: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.id === socketId ? { ...p, preferredRole: payload.role ?? undefined } : p,
      ),
    }
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
  })

  socket.on('game:start', (payload: { roomId: string }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.hostId !== socketId) return
    if (state.players.length < 4) {
      socket.emit('error', { message: '4人以上必要です（CPUを追加できます）' })
      return
    }

    const newState = createInitialGameState(
      payload.roomId,
      state.players.map((p) => ({ id: p.id, name: p.name, isBot: p.isBot, preferredRole: p.preferredRole })),
      socketId,
    )
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
    broadcastRoomList(io)

    // Kick off CPU votes for first round
    schedulePhaseAdvance(io, payload.roomId, 1000, () => triggerCpuVotes(io, payload.roomId))
  })

  socket.on('traitor:vote', (payload: { roomId: string; targetSection: SectionId }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.phase !== 'traitor-voting') return

    const { state: newState, allVoted } = submitTraitorVote(state, socketId, payload.targetSection)
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)

    if (allVoted) {
      schedulePhaseAdvance(io, payload.roomId, 500, () => {
        const s = rooms.get(payload.roomId)!
        const resolved = resolveTraitorVoting(s)
        rooms.set(payload.roomId, resolved)
        broadcastGameState(io, resolved)

        if (resolved.phase === 'watchtower-reveal') {
          schedulePhaseAdvance(io, payload.roomId, 4000, () => {
            const s2 = rooms.get(payload.roomId)!
            if (s2.phase !== 'watchtower-reveal') return
            const advanced = advanceFromWatchtowerReveal(s2)
            rooms.set(payload.roomId, advanced)
            broadcastGameState(io, advanced)
            triggerCpuActions(io, payload.roomId)
          })
        } else {
          triggerCpuActions(io, payload.roomId)
        }
      })
    } else {
      // Let remaining CPU traitors vote
      schedulePhaseAdvance(io, payload.roomId, 600, () => triggerCpuVotes(io, payload.roomId))
    }
  })

  socket.on('action:submit', (payload: { roomId: string; cardId: string; targetSection: SectionId }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.phase !== 'action') return

    const { state: newState, allSubmitted } = submitPlayerAction(
      state,
      socketId,
      payload.cardId,
      payload.targetSection,
    )
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)

    if (allSubmitted) {
      resolveAfterAllActions(io, payload.roomId)
    } else {
      // Trigger any CPU players that haven't acted yet
      schedulePhaseAdvance(io, payload.roomId, 400, () => triggerCpuActions(io, payload.roomId))
    }
  })

  socket.on('player:transform', (payload: { roomId: string }) => {
    const state = rooms.get(payload.roomId)
    if (!state) return

    const newState = transformPlayer(state, socketId)
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
  })

  socket.on('lobby:list', () => {
    broadcastRoomList(io)
  })

  socket.on('disconnect', () => {
    const info = lobbyPlayers.get(socketId)
    if (!info) return

    lobbyPlayers.delete(socketId)
    const state = rooms.get(info.roomId)
    if (!state) return

    if (state.phase === 'lobby') {
      const newPlayers = state.players.filter((p) => p.id !== socketId)
      if (newPlayers.filter((p) => !p.isBot).length === 0) {
        rooms.delete(info.roomId)
        broadcastRoomList(io)
        return
      }
      const newHostId = state.hostId === socketId ? newPlayers.find((p) => !p.isBot)!.id : state.hostId
      const newState: GameState = {
        ...state,
        players: newPlayers,
        hostId: newHostId,
        log: [...state.log, `${info.name} が退出しました`],
      }
      rooms.set(info.roomId, newState)
      broadcastGameState(io, newState)
      broadcastRoomList(io)
    }
  })
}
