'use client'

import { Section, SectionId } from '@/game/types'

interface Props {
  section: Section
  isSelected?: boolean
  isAttackTarget?: boolean
  onClick?: () => void
  selectable?: boolean
}

export default function SectionCard({
  section,
  isSelected,
  isAttackTarget,
  onClick,
  selectable,
}: Props) {
  const hpPercent = section.isCollapsed ? 0 : (section.hp / section.maxHp) * 100

  const hpColor =
    section.isCollapsed
      ? 'bg-gray-700'
      : hpPercent > 60
      ? 'bg-green-500'
      : hpPercent > 30
      ? 'bg-yellow-500'
      : 'bg-red-500'

  const borderColor = section.isCollapsed
    ? 'border-gray-700'
    : isAttackTarget
    ? 'border-red-500 shadow-red-500/40 shadow-lg animate-pulse'
    : isSelected
    ? 'border-amber-glow shadow-amber-glow/40 shadow-lg'
    : section.bonusActive
    ? 'border-teal-glow'
    : 'border-dark-border'

  const bonusDesc: Record<SectionId, string> = {
    watchtower: '攻撃目標を開示',
    gate: 'ダメージ-1',
    armory: '持ち越し+1、修復+1',
    barracks: '毎ターン最低HPに+2',
  }

  return (
    <button
      onClick={onClick}
      disabled={!selectable || section.isCollapsed}
      className={`
        relative bg-dark-card border-2 rounded-xl p-3 text-left transition-all duration-200
        ${borderColor}
        ${selectable && !section.isCollapsed ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${section.isCollapsed ? 'opacity-50' : ''}
        min-w-[140px]
      `}
    >
      {/* Bonus badge */}
      {section.bonusActive && !section.isCollapsed && (
        <div className="absolute -top-2 -right-2 bg-teal-glow text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
          MAX
        </div>
      )}

      {/* Collapsed overlay */}
      {section.isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
          <span className="text-red-500 font-bold text-sm">崩壊</span>
        </div>
      )}

      {/* Fortified indicator */}
      {section.fortified && !section.isCollapsed && (
        <div className="absolute top-1 right-1 text-xs">🛡️</div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{section.emoji}</span>
        <div>
          <div className="text-sm font-bold text-white leading-tight">{section.nameJa}</div>
          {section.bonusActive && !section.isCollapsed && (
            <div className="text-[10px] text-teal-400 leading-tight">{bonusDesc[section.id]}</div>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>HP</span>
          <span>{section.isCollapsed ? '0' : section.hp}/{section.maxHp}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={`${hpColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Markers */}
      {section.markers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {section.markers.map((marker) => (
            <div
              key={marker.id}
              className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                marker.type === 'damage' ? 'bg-red-700' : 'bg-purple-700'
              }`}
              title={marker.type === 'damage' ? 'ダメージマーカー' : '呪いマーカー'}
            >
              {marker.type === 'damage' ? '⚠' : '💀'}
            </div>
          ))}
        </div>
      )}

      {/* Status effects */}
      {section.repairDisabledNextRound && (
        <div className="text-[10px] text-orange-400 mt-1">⚠ 修復不可（次ターン）</div>
      )}
      {section.doubleDamageNextRound && (
        <div className="text-[10px] text-red-400 mt-1">⚠ ダメージ×2（次ターン）</div>
      )}
    </button>
  )
}
