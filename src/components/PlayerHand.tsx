'use client'

import { Card, GamePhase, Player } from '@/game/types'

interface Props {
  hand: Card[]
  selectedCardId: string | null
  onSelectCard: (cardId: string) => void
  phase: GamePhase
  myPlayer: Player
  canPlay: boolean
}

const CARD_TYPE_STYLE: Record<string, string> = {
  defense: 'border-blue-500/60 bg-blue-950/40',
  cursed: 'border-purple-500/60 bg-purple-950/40',
  transformation: 'border-red-500/60 bg-red-950/40',
}

const CARD_TYPE_LABEL: Record<string, string> = {
  defense: '防衛',
  cursed: '呪い',
  transformation: '変身',
}

const CARD_TYPE_LABEL_COLOR: Record<string, string> = {
  defense: 'text-blue-400',
  cursed: 'text-purple-400',
  transformation: 'text-red-400',
}

interface CardItemProps {
  card: Card
  isSelected: boolean
  onSelect: () => void
  disabled: boolean
}

function CardItem({ card, isSelected, onSelect, disabled }: CardItemProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative flex flex-col rounded-xl border-2 p-3 text-left transition-all duration-200 min-w-[120px] max-w-[140px]
        ${CARD_TYPE_STYLE[card.type]}
        ${isSelected ? 'border-amber-glow shadow-amber-glow/50 shadow-lg scale-105 -translate-y-2' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:-translate-y-1'}
      `}
    >
      <div className={`text-[10px] font-bold mb-1 ${CARD_TYPE_LABEL_COLOR[card.type]}`}>
        {CARD_TYPE_LABEL[card.type]}
      </div>
      <div className="text-sm font-bold text-white leading-tight mb-1">{card.nameJa}</div>
      <div className="text-[10px] text-gray-400 leading-snug">{card.descriptionJa}</div>

      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-glow rounded-full flex items-center justify-center text-black text-xs font-bold">
          ✓
        </div>
      )}
    </button>
  )
}

export default function PlayerHand({ hand, selectedCardId, onSelectCard, phase, myPlayer, canPlay }: Props) {
  const isCapturedOrStunned = myPlayer.isCaptured || myPlayer.isStunned
  const restrictedEffects = ['capture', 'release', 'escape', 'forced_release']

  const isCardPlayable = (card: Card): boolean => {
    if (!canPlay) return false
    if (phase !== 'action') return false
    if (isCapturedOrStunned && !restrictedEffects.includes(card.effect)) return false
    if (card.type === 'transformation' && !myPlayer.isTransformed) return false
    return true
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-300">手札</span>
        {isCapturedOrStunned && (
          <span className="text-xs text-yellow-400">
            {myPlayer.isCaptured ? '⛓ 拘束中' : '⚡ スタン中'} — 一部カードのみ使用可
          </span>
        )}
      </div>
      {hand.length === 0 ? (
        <div className="text-gray-600 text-sm italic text-center py-4">手札なし</div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {hand.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onSelect={() => onSelectCard(card.id)}
              disabled={!isCardPlayable(card)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
