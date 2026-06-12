'use client'

import { GamePhase } from '@/game/types'

const PHASE_INFO: Record<GamePhase, { label: string; color: string; icon: string }> = {
  lobby: { label: 'ロビー', color: 'text-gray-400', icon: '🏠' },
  'traitor-voting': { label: '裏切り者投票', color: 'text-red-400', icon: '🗳️' },
  'watchtower-reveal': { label: '見張り塔の啓示', color: 'text-yellow-300', icon: '🗼' },
  action: { label: '行動フェーズ', color: 'text-blue-400', icon: '⚔️' },
  'immediate-effects': { label: '即時効果解決', color: 'text-purple-400', icon: '✨' },
  'marker-visualization': { label: 'マーカー確認', color: 'text-orange-400', icon: '🔮' },
  'enemy-attack': { label: '敵の攻撃', color: 'text-red-500', icon: '💥' },
  draw: { label: 'ドローフェーズ', color: 'text-green-400', icon: '🃏' },
  'game-over': { label: 'ゲーム終了', color: 'text-amber-300', icon: '🌅' },
}

const PHASES_ORDER: GamePhase[] = [
  'traitor-voting',
  'watchtower-reveal',
  'action',
  'immediate-effects',
  'marker-visualization',
  'enemy-attack',
  'draw',
]

interface Props {
  phase: GamePhase
  round: number
  dawnCounter: number
}

export default function PhaseIndicator({ phase, round, dawnCounter }: Props) {
  const info = PHASE_INFO[phase]

  return (
    <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-2 py-1.5">
      {/* Round */}
      <div className="flex items-baseline gap-1 flex-shrink-0">
        <span className="text-[10px] text-gray-500">R</span>
        <span className="text-lg font-bold text-amber-glow leading-none">{round}</span>
      </div>

      <div className="w-px h-6 bg-dark-border flex-shrink-0" />

      {/* Dawn counter */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {Array.from({ length: 8 }).map((_, i) => {
          const filled = i < dawnCounter
          const isNext = i === dawnCounter - 1
          return (
            <div
              key={i}
              className={`w-2 h-4 rounded-sm transition-all duration-500 ${
                filled
                  ? isNext
                    ? 'bg-amber-glow shadow-[0_0_4px_rgba(251,191,36,0.8)]'
                    : 'bg-amber-500/70'
                  : 'bg-dark-border'
              }`}
            />
          )
        })}
      </div>

      <div className="w-px h-6 bg-dark-border flex-shrink-0" />

      {/* Phase */}
      <span className={`text-xs font-semibold truncate ${info.color}`}>
        {info.icon} <span className="hidden sm:inline">{info.label}</span>
      </span>
    </div>
  )
}
