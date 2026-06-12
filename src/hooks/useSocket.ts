'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { PlayerView, SectionId } from '@/game/types'

// Module-level singletons so state survives page navigation
let globalSocket: Socket | null = null
let globalGameState: PlayerView | null = null
let globalConnected = false
let globalRooms: RoomInfo[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io({ transports: ['websocket', 'polling'] })

    globalSocket.on('connect', () => {
      globalConnected = true
      notify()
    })
    globalSocket.on('disconnect', () => {
      globalConnected = false
      notify()
    })
    globalSocket.on('game:state', (state: PlayerView) => {
      globalGameState = state
      notify()
    })
    globalSocket.on('lobby:rooms', (list: RoomInfo[]) => {
      globalRooms = list
      notify()
    })
  }
  return globalSocket
}

export interface UseSocketReturn {
  socket: Socket | null
  gameState: PlayerView | null
  error: string | null
  connected: boolean
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

interface RoomInfo {
  roomId: string
  playerCount: number
  maxPlayers: number
  hostName: string
  started: boolean
}

export function useSocket(): UseSocketReturn {
  const socket = getSocket()
  const [, rerender] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fn = () => rerender((n) => n + 1)
    listeners.add(fn)

    const onError = (err: { message: string }) => setError(err.message)
    socket.on('error', onError)

    if (socket.connected) {
      globalConnected = true
      rerender((n) => n + 1)
    }

    return () => {
      listeners.delete(fn)
      socket.off('error', onError)
    }
  }, [socket])

  const createRoom = useCallback((playerName: string) => {
    socket.emit('lobby:create', { playerName })
  }, [socket])

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socket.emit('lobby:join', { roomId, playerName })
  }, [socket])

  const startGame = useCallback((roomId: string) => {
    socket.emit('game:start', { roomId })
  }, [socket])

  const submitVote = useCallback((roomId: string, targetSection: SectionId) => {
    socket.emit('traitor:vote', { roomId, targetSection })
  }, [socket])

  const submitAction = useCallback((roomId: string, cardId: string, targetSection: SectionId) => {
    socket.emit('action:submit', { roomId, cardId, targetSection })
  }, [socket])

  const transform = useCallback((roomId: string) => {
    socket.emit('player:transform', { roomId })
  }, [socket])

  const listRooms = useCallback(() => {
    socket.emit('lobby:list')
  }, [socket])

  const addCpu = useCallback((roomId: string) => {
    socket.emit('lobby:add_cpu', { roomId })
  }, [socket])

  const removeCpu = useCallback((roomId: string, cpuId: string) => {
    socket.emit('lobby:remove_cpu', { roomId, cpuId })
  }, [socket])

  const setRole = useCallback((roomId: string, role: 'defender' | 'traitor' | null) => {
    socket.emit('lobby:set_role', { roomId, role })
  }, [socket])

  return {
    socket,
    gameState: globalGameState,
    error,
    connected: globalConnected,
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
