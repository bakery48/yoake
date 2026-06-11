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
    <div className="flex items-center gap-4 bg-dark-card border border-dark-border rounded-lg px-4 py-2">
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-xs text-gray-500">ラウンド</span>
        <span className="text-2xl font-bold text-amber-glow">{round}</span>
      </div>

      <div className="w-px h-10 bg-dark-border" />

      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-xs text-gray-500">夜明けまで</span>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-4 rounded-sm ${
                i < dawnCounter ? 'bg-amber-glow' : 'bg-dark-border'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="w-px h-10 bg-dark-border" />

      <div className="flex flex-col flex-1">
        <span className="text-xs text-gray-500">現在フェーズ</span>
        <span className={`text-sm font-semibold ${info.color}`}>
          {info.icon} {info.label}
        </span>
      </div>
    </div>
  )
}
