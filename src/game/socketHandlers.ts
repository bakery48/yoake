import { Server, Socket } from 'socket.io'
import {
  GameState,
  Player,
  SectionId,
  RoomInfo,
  PlayerView,
} from './types'
import {
  createInitialGameState,
  buildPlayerView,
  submitTraitorVote,
  resolveTraitorVoting,
  advanceFromWatchtowerReveal,
  submitPlayerAction,
  resolveImmediateEffects,
  resolveMarkerVisualization,
  resolveEnemyAttack,
  resolveDraw,
  transformPlayer,
} from './gameLogic'

// In-memory storage
const rooms = new Map<string, GameState>()
const lobbyPlayers = new Map<string, { id: string; name: string; roomId: string }>()

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function broadcastGameState(io: Server, state: GameState) {
  for (const player of state.players) {
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

// Auto-advance phases after a short delay
function schedulePhaseAdvance(io: Server, roomId: string, delayMs: number, fn: () => void) {
  setTimeout(() => {
    const state = rooms.get(roomId)
    if (!state) return
    fn()
  }, delayMs)
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  const { id: socketId } = socket

  socket.on('lobby:create', (payload: { playerName: string }) => {
    let roomId = generateRoomCode()
    while (rooms.has(roomId)) roomId = generateRoomCode()

    const player = { id: socketId, name: payload.playerName }
    // Create a lobby-state game
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

    const newPlayer = {
      id: socketId,
      name: playerName,
      role: 'defender' as const,
      isTransformed: false,
      isCaptured: false,
      capturedTurnsLeft: 0,
      isStunned: false,
      stunnedTurnsLeft: 0,
      hand: [],
      isReady: false,
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

  socket.on('game:start', (payload: { roomId: string }) => {
    const state = rooms.get(payload.roomId)
    if (!state || state.hostId !== socketId) return
    if (state.players.length < 4) {
      socket.emit('error', { message: '4人以上必要です' })
      return
    }

    const newState = createInitialGameState(
      payload.roomId,
      state.players.map((p) => ({ id: p.id, name: p.name })),
      socketId,
    )
    rooms.set(payload.roomId, newState)
    broadcastGameState(io, newState)
    broadcastRoomList(io)
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

        // If watchtower-reveal, auto-advance after 4 seconds
        if (resolved.phase === 'watchtower-reveal') {
          schedulePhaseAdvance(io, payload.roomId, 4000, () => {
            const s2 = rooms.get(payload.roomId)!
            if (s2.phase !== 'watchtower-reveal') return
            const advanced = advanceFromWatchtowerReveal(s2)
            rooms.set(payload.roomId, advanced)
            broadcastGameState(io, advanced)
          })
        }
      })
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
      schedulePhaseAdvance(io, payload.roomId, 800, () => {
        const s = rooms.get(payload.roomId)!
        if (s.phase !== 'action') return
        const afterEffects = resolveImmediateEffects(s)
        rooms.set(payload.roomId, afterEffects)
        broadcastGameState(io, afterEffects)

        // Marker visualization - auto advance after 3s
        schedulePhaseAdvance(io, payload.roomId, 3000, () => {
          const s2 = rooms.get(payload.roomId)!
          if (s2.phase !== 'marker-visualization') return
          const afterMarkers = resolveMarkerVisualization(s2)
          rooms.set(payload.roomId, afterMarkers)
          broadcastGameState(io, afterMarkers)

          // Enemy attack - auto advance after 3s
          schedulePhaseAdvance(io, payload.roomId, 3000, () => {
            const s3 = rooms.get(payload.roomId)!
            if (s3.phase !== 'enemy-attack') return
            const afterAttack = resolveEnemyAttack(s3)
            rooms.set(payload.roomId, afterAttack)
            broadcastGameState(io, afterAttack)

            if (afterAttack.phase === 'game-over') return

            // Draw phase - auto advance after 3s
            schedulePhaseAdvance(io, payload.roomId, 3000, () => {
              const s4 = rooms.get(payload.roomId)!
              if (s4.phase !== 'draw') return
              const afterDraw = resolveDraw(s4)
              rooms.set(payload.roomId, afterDraw)
              broadcastGameState(io, afterDraw)
            })
          })
        })
      })
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
      // Remove player from lobby
      const newPlayers = state.players.filter((p) => p.id !== socketId)
      if (newPlayers.length === 0) {
        rooms.delete(info.roomId)
        broadcastRoomList(io)
        return
      }
      const newHostId = state.hostId === socketId ? newPlayers[0].id : state.hostId
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
    // If game in progress, keep player ghost (reconnection not implemented)
  })
}
