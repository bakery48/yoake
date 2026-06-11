'use client'

import { PlayerPublicInfo, Player } from '@/game/types'

interface Props {
  players: PlayerPublicInfo[]
  myId: string
  traitorAllies: string[]
  actionsSubmitted: string[]
  onSelectTarget?: (playerId: string) => void
  selectedTargetId?: string | null
}

export default function PlayerList({
  players,
  myId,
  traitorAllies,
  actionsSubmitted,
  onSelectTarget,
  selectedTargetId,
}: Props) {
  return (
    <div className="space-y-1.5">
      {players.map((player) => {
        const isMe = player.id === myId
        const isAlly = traitorAllies.includes(player.id)
        const hasSubmitted = actionsSubmitted.includes(player.id)
        const isSelected = selectedTargetId === player.id

        return (
          <button
            key={player.id}
            onClick={() => onSelectTarget?.(player.id)}
            disabled={!onSelectTarget}
            className={`
              w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all
              ${onSelectTarget ? 'cursor-pointer hover:bg-dark-border' : 'cursor-default'}
              ${isSelected ? 'bg-amber-glow/20 border border-amber-glow' : 'bg-dark-card border border-dark-border'}
            `}
          >
            {/* Status dot */}
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                player.isCaptured
                  ? 'bg-red-500'
                  : player.isStunned
                  ? 'bg-yellow-500'
                  : hasSubmitted
                  ? 'bg-green-500'
                  : 'bg-gray-600'
              }`}
            />

            {/* Name */}
            <span
              className={`flex-1 text-sm font-medium ${
                isMe ? 'text-amber-glow' : isAlly ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {player.name}
              {isMe && <span className="text-xs text-gray-500 ml-1">（あなた）</span>}
              {isAlly && <span className="text-xs text-red-600 ml-1">（仲間）</span>}
              {player.isBot && <span className="text-[10px] text-blue-400 ml-1">CPU</span>}
              {player.isTransformed && <span className="text-xs ml-1">👹</span>}
            </span>

            {/* Card count */}
            <span className="text-xs text-gray-500">
              🃏{player.cardCount}
            </span>

            {/* Status badges */}
            <div className="flex gap-1">
              {player.isCaptured && (
                <span className="text-[10px] bg-red-900/60 text-red-400 px-1 rounded">
                  拘束({player.capturedTurnsLeft})
                </span>
              )}
              {player.isStunned && (
                <span className="text-[10px] bg-yellow-900/60 text-yellow-400 px-1 rounded">
                  スタン({player.stunnedTurnsLeft})
                </span>
              )}
              {player.maxPlaysThisTurn > 1 && (
                <span className="text-[10px] bg-blue-900/60 text-blue-400 px-1 rounded">
                  激励
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
