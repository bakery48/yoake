'use client'

import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import GameBoard from '@/components/GameBoard'
import { SectionId } from '@/game/types'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const { gameState, submitVote, submitAction, transform, leaveRoom, rematch } = useSocket()

  if (!gameState || (gameState.phase === 'lobby' && gameState.roomId !== roomId)) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-glow text-xl font-bold mb-2 animate-pulse">接続中…</div>
          <div className="text-gray-500 text-sm mb-6">ゲーム状態を読み込んでいます</div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            ロビーに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameBoard
      state={gameState}
      onVote={(sectionId) => submitVote(roomId, sectionId)}
      onAction={(cardId, targetSection, sabotageSection) => submitAction(roomId, cardId, targetSection, sabotageSection)}
      onTransform={() => transform(roomId)}
      onLeave={() => { leaveRoom(roomId); router.push('/') }}
      onRematch={() => rematch(roomId)}
    />
  )
}
