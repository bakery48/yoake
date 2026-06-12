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

const CARD_IMAGE_BG: Record<string, string> = {
  defense: 'bg-blue-900/70',
  cursed: 'bg-purple-900/70',
  transformation: 'bg-red-900/70',
}

const CARD_BORDER: Record<string, string> = {
  defense: 'border-blue-500/60',
  cursed: 'border-purple-500/60',
  transformation: 'border-red-500/60',
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
        relative flex flex-col rounded-2xl border-2 text-left transition-all duration-200 w-[120px]
        bg-[#1a1a2e]
        ${CARD_BORDER[card.type]}
        ${isSelected ? 'border-amber-glow shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105 -translate-y-2' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:-translate-y-1'}
      `}
    >
      {/* Artwork area with bezel padding */}
      <div className="p-2 pb-0">
        <div className={`w-full rounded-xl overflow-hidden ${CARD_IMAGE_BG[card.type]}`} style={{ aspectRatio: '4/3' }}>
          <img
            src={`/cards/${card.effect}.png`}
            alt={card.nameJa}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      </div>

      {/* Card info */}
      <div className="p-2 pt-1.5">
        <div className={`text-[9px] font-bold mb-0.5 ${CARD_TYPE_LABEL_COLOR[card.type]}`}>
          {CARD_TYPE_LABEL[card.type]}
        </div>
        <div className="text-xs font-bold text-white leading-tight mb-1">{card.nameJa}</div>
        <div className="text-[9px] text-gray-400 leading-snug">{card.descriptionJa}</div>
      </div>

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
