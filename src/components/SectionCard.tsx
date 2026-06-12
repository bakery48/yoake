'use client'

import Image from 'next/image'
import { Section, SectionId } from '@/game/types'

const SECTION_IMAGES: Record<SectionId, string> = {
  watchtower: '/sections/watchtower.png',
  gate:       '/sections/gate.png',
  armory:     '/sections/armory.png',
  barracks:   '/sections/barracks.png',
}

const BONUS_DESC: Record<SectionId, string> = {
  watchtower: '攻撃目標を開示',
  gate:       'ダメージ-1',
  armory:     '持ち越し+1',
  barracks:   '毎ラウンド最低耐久度に+1',
}

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
    section.isCollapsed ? 'bg-gray-600'
    : hpPercent > 60    ? 'bg-green-500'
    : hpPercent > 30    ? 'bg-yellow-500'
    :                     'bg-red-500'

  const borderColor = section.isCollapsed
    ? 'border-gray-700'
    : isAttackTarget
    ? 'border-red-500 shadow-red-500/50 shadow-xl animate-pulse'
    : isSelected
    ? 'border-amber-glow shadow-amber-glow/50 shadow-xl'
    : section.bonusActive
    ? 'border-teal-500/70'
    : 'border-stone-600/60'

  return (
    <button
      onClick={onClick}
      disabled={!selectable || section.isCollapsed}
      className={`
        relative flex flex-col bg-stone-900/90 border-2 rounded-lg overflow-hidden
        text-left transition-all duration-200 w-[160px]
        ${borderColor}
        ${selectable && !section.isCollapsed ? 'cursor-pointer hover:scale-105 hover:brightness-110' : 'cursor-default'}
        ${section.isCollapsed ? 'opacity-40 grayscale' : ''}
      `}
    >
      {/* Section illustration */}
      <div className="relative w-full h-[120px] bg-stone-800 flex items-center justify-center overflow-hidden">
        <Image
          src={SECTION_IMAGES[section.id]}
          alt={section.nameJa}
          fill
          className="object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {/* Fallback emoji */}
        <span className="text-4xl opacity-40 select-none">{section.emoji}</span>

        {/* Attack target red vignette */}
        {isAttackTarget && (
          <div className="absolute inset-0 bg-red-600/30 animate-pulse" />
        )}

        {/* Collapsed overlay */}
        {section.isCollapsed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <span className="text-red-400 font-bold text-sm tracking-widest">崩壊</span>
          </div>
        )}

        {/* Fortified shield */}
        {section.fortified && !section.isCollapsed && (
          <div className="absolute top-1 right-1 text-base drop-shadow">🛡️</div>
        )}

        {/* MAX bonus badge */}
        {section.bonusActive && !section.isCollapsed && (
          <div className="absolute top-1 left-1 bg-teal-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold leading-none">
            MAX
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1">
        {/* Name */}
        <div className="flex items-center gap-1">
          <span className="text-sm">{section.emoji}</span>
          <span className="text-sm font-bold text-stone-100 leading-tight">{section.nameJa}</span>
        </div>

        {/* Bonus description */}
        {section.bonusActive && !section.isCollapsed && (
          <div className="text-[9px] text-teal-400 leading-tight">{BONUS_DESC[section.id]}</div>
        )}

        {/* HP bar */}
        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-0.5">
            <span>耐久度</span>
            <span>{section.isCollapsed ? '0' : section.hp}/{section.maxHp}</span>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-1.5">
            <div
              className={`${hpColor} h-1.5 rounded-full transition-all duration-500`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Markers */}
        {section.markers.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {section.markers.map((marker) => (
              <div
                key={marker.id}
                className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center ${
                  marker.type === 'damage' ? 'bg-red-800' : 'bg-purple-800'
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
          <div className="text-[9px] text-orange-400">⚠ 修復不可</div>
        )}
        {section.doubleDamageNextRound && (
          <div className="text-[9px] text-red-400">⚠ ダメージ×2</div>
        )}
      </div>
    </button>
  )
}
