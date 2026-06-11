'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { PlayerView, SectionId } from '@/game/types'

let globalSocket: Socket | null = null

function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io({
      transports: ['websocket', 'polling'],
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
  const [gameState, setGameState] = useState<PlayerView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onGameState = (state: PlayerView) => setGameState(state)
    const onError = (err: { message: string }) => setError(err.message)
    const onRooms = (list: RoomInfo[]) => setRooms(list)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('game:state', onGameState)
    socket.on('error', onError)
    socket.on('lobby:rooms', onRooms)

    if (socket.connected) setConnected(true)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('game:state', onGameState)
      socket.off('error', onError)
      socket.off('lobby:rooms', onRooms)
    }
  }, [])

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('lobby:create', { playerName })
  }, [])

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socketRef.current?.emit('lobby:join', { roomId, playerName })
  }, [])

  const startGame = useCallback((roomId: string) => {
    socketRef.current?.emit('game:start', { roomId })
  }, [])

  const submitVote = useCallback((roomId: string, targetSection: SectionId) => {
    socketRef.current?.emit('traitor:vote', { roomId, targetSection })
  }, [])

  const submitAction = useCallback((roomId: string, cardId: string, targetSection: SectionId) => {
    socketRef.current?.emit('action:submit', { roomId, cardId, targetSection })
  }, [])

  const transform = useCallback((roomId: string) => {
    socketRef.current?.emit('player:transform', { roomId })
  }, [])

  const listRooms = useCallback(() => {
    socketRef.current?.emit('lobby:list')
  }, [])

  const addCpu = useCallback((roomId: string) => {
    socketRef.current?.emit('lobby:add_cpu', { roomId })
  }, [])

  const removeCpu = useCallback((roomId: string, cpuId: string) => {
    socketRef.current?.emit('lobby:remove_cpu', { roomId, cpuId })
  }, [])

  return {
    socket: socketRef.current,
    gameState,
    error,
    connected,
    createRoom,
    joinRoom,
    startGame,
    submitVote,
    submitAction,
    transform,
    listRooms,
    addCpu,
    removeCpu,
    rooms,
  }
}
