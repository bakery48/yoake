'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import Lobby from '@/components/Lobby'

export default function Home() {
  const router = useRouter()
  const {
    gameState,
    error,
    connected,
    pendingRoomId,
    createRoom,
    joinRoom,
    startGame,
    listRooms,
    addCpu,
    removeCpu,
    setRole,
    rooms,
  } = useSocket()

  // Navigate to game when game starts for our room
  useEffect(() => {
    if (
      gameState &&
      gameState.phase !== 'lobby' &&
      pendingRoomId &&
      gameState.roomId === pendingRoomId
    ) {
      router.push(`/game/${pendingRoomId}`)
    }
  }, [gameState, pendingRoomId, router])

  const inRoom =
    pendingRoomId !== null &&
    gameState?.phase === 'lobby' &&
    gameState?.roomId === pendingRoomId

  return (
    <Lobby
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onListRooms={listRooms}
      rooms={rooms}
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
              isBot: p.isBot,
              preferredRole: p.preferredRole,
            }))
          : []
      }
      myId={gameState?.myPlayer.id ?? null}
      hostId={gameState?.hostId ?? null}
      onStartGame={startGame}
      onAddCpu={addCpu}
      onRemoveCpu={removeCpu}
      onSetRole={setRole}
    />
  )
}
