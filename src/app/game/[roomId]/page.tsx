'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import GameBoard from '@/components/GameBoard'
import { SectionId } from '@/game/types'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const { gameState, error, submitVote, submitAction, transform } = useSocket()

  // If no game state, redirect to lobby (e.g. page refresh)
  useEffect(() => {
    if (!gameState && typeof window !== 'undefined') {
      // Give it a moment to reconnect
      const timer = setTimeout(() => {
        if (!gameState) {
          // We can't recover state after refresh without persistence
          // Show an error instead
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [gameState])

  if (!gameState) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-glow text-xl font-bold mb-2 animate-pulse">
            接続中…
          </div>
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

  if (gameState.roomId !== roomId && gameState.phase === 'lobby') {
    router.push('/')
    return null
  }

  return (
    <GameBoard
      state={gameState}
      onVote={(sectionId) => submitVote(roomId, sectionId)}
      onAction={(cardId, targetSection) => submitAction(roomId, cardId, targetSection)}
      onTransform={() => transform(roomId)}
    />
  )
}
