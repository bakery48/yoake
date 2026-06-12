'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { PlayerView, SectionId } from '@/game/types'

interface RoomInfo {
  roomId: string
  playerCount: number
  maxPlayers: number
  hostName: string
  started: boolean
}

// ─── Module-level singletons (survive page navigation) ────────────────────────

let socket: Socket | null = null
let globalGameState: PlayerView | null = null
let globalConnected = false
let globalRooms: RoomInfo[] = []
let globalPendingRoomId: string | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

function initSocket(): Socket {
  if (socket) return socket  // only ever create one

  socket = io({ transports: ['websocket', 'polling'] })

  socket.on('connect', () => { globalConnected = true; notify() })
  socket.on('disconnect', () => { globalConnected = false; notify() })
  socket.on('game:state', (state: PlayerView) => { globalGameState = state; notify() })
  socket.on('lobby:rooms', (list: RoomInfo[]) => { globalRooms = list; notify() })
  socket.on('lobby:created', ({ roomId }: { roomId: string }) => {
    globalPendingRoomId = roomId; notify()
  })
  socket.on('lobby:joined', ({ roomId }: { roomId: string }) => {
    globalPendingRoomId = roomId; notify()
  })

  return socket
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSocketReturn {
  gameState: PlayerView | null
  error: string | null
  connected: boolean
  pendingRoomId: string | null
  createRoom: (playerName: string) => void
  joinRoom: (roomId: string, playerName: string) => void
  startGame: (roomId: string) => void
  submitVote: (roomId: string, targetSection: SectionId) => void
  submitAction: (roomId: string, cardId: string, targetSection: SectionId) => void
  transform: (roomId: string) => void
  listRooms: () => void
  addCpu: (roomId: string) => void
  removeCpu: (roomId: string, cpuId: string) => void
  setRole: (roomId: string, role: 'defender' | 'traitor' | null) => void
  rooms: RoomInfo[]
}

export function useSocket(): UseSocketReturn {
  const s = initSocket()
  const [, rerender] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fn = () => rerender((n) => n + 1)
    listeners.add(fn)

    const onError = (err: { message: string }) => setError(err.message)
    s.on('error', onError)

    // Sync connected state in case socket was already connected on mount
    if (s.connected && !globalConnected) {
      globalConnected = true
      rerender((n) => n + 1)
    }

    return () => {
      listeners.delete(fn)
      s.off('error', onError)
    }
  }, [s])

  const createRoom  = useCallback((playerName: string) => s.emit('lobby:create', { playerName }), [s])
  const joinRoom    = useCallback((roomId: string, playerName: string) => s.emit('lobby:join', { roomId, playerName }), [s])
  const startGame   = useCallback((roomId: string) => s.emit('game:start', { roomId }), [s])
  const submitVote  = useCallback((roomId: string, t: SectionId) => s.emit('traitor:vote', { roomId, targetSection: t }), [s])
  const submitAction = useCallback((roomId: string, cardId: string, t: SectionId) => s.emit('action:submit', { roomId, cardId, targetSection: t }), [s])
  const transform   = useCallback((roomId: string) => s.emit('player:transform', { roomId }), [s])
  const listRooms   = useCallback(() => s.emit('lobby:list'), [s])
  const addCpu      = useCallback((roomId: string) => s.emit('lobby:add_cpu', { roomId }), [s])
  const removeCpu   = useCallback((roomId: string, cpuId: string) => s.emit('lobby:remove_cpu', { roomId, cpuId }), [s])
  const setRole     = useCallback((roomId: string, role: 'defender' | 'traitor' | null) => s.emit('lobby:set_role', { roomId, role }), [s])

  return {
    gameState: globalGameState,
    error,
    connected: globalConnected,
    pendingRoomId: globalPendingRoomId,
    createRoom,
    joinRoom,
    startGame,
    submitVote,
    submitAction,
    transform,
    listRooms,
    addCpu,
    removeCpu,
    setRole,
    rooms: globalRooms,
  }
}
