'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import Lobby from '@/components/Lobby'

export default function Home() {
  const router = useRouter()
  const {
    gameState,
    error,
    connected,
    createRoom,
    joinRoom,
    startGame,
    listRooms,
    rooms,
    socket,
  } = useSocket()

  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)

  // Listen for room creation/join confirmations
  useEffect(() => {
    if (!socket) return

    const onCreated = ({ roomId }: { roomId: string }) => {
      setPendingRoomId(roomId)
    }

    const onJoined = ({ roomId }: { roomId: string }) => {
      setPendingRoomId(roomId)
    }

    socket.on('lobby:created', onCreated)
    socket.on('lobby:joined', onJoined)

    return () => {
      socket.off('lobby:created', onCreated)
      socket.off('lobby:joined', onJoined)
    }
  }, [socket])

  // Navigate to game room once game starts
  useEffect(() => {
    if (gameState && gameState.phase !== 'lobby' && pendingRoomId) {
      router.push(`/game/${pendingRoomId}`)
    }
  }, [gameState, pendingRoomId, router])

  const inRoom = pendingRoomId !== null && gameState?.phase === 'lobby'

  return (
    <Lobby
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onListRooms={listRooms}
      rooms={rooms as any}
      error={error}
      connected={connected}
      inRoom={!!inRoom}
      roomId={pendingRoomId}
      players={
        inRoom && gameState
          ? gameState.players.map((p) => ({
              id: p.id,
              name: p.name,
              cardCount: p.cardCount,
              isReady: p.isReady,
            }))
          : []
      }
      myId={gameState?.myPlayer.id ?? null}
      hostId={gameState?.hostId ?? null}
      onStartGame={startGame}
    />
  )
}
