'use client'

import { Section, SectionId } from '@/game/types'
import SectionCard from './SectionCard'

const SECTION_POSITIONS: Record<SectionId, { x: number; y: number }> = {
  watchtower: { x: 44, y:  4 },
  gate:       { x: 44, y: 68 },
  armory:     { x: 72, y: 32 },
  barracks:   { x:  4, y: 32 },
}

interface Props {
  sections: Section[]
  attackTarget: SectionId | null
  selectedSection: SectionId | null
  showAttackTarget: boolean
  selectable: boolean
  onSectionClick: (id: SectionId) => void
}

export default function FortressMap({
  sections,
  attackTarget,
  selectedSection,
  showAttackTarget,
  selectable,
  onSectionClick,
}: Props) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-dark-border"
      style={{
        aspectRatio: '16/9',
        backgroundImage: 'url(/map.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1c1917', // fallback stone-900
      }}
    >
      {/* Dark overlay to help cards stand out */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Section cards positioned on the map */}
      {sections.map((section) => {
        const pos = SECTION_POSITIONS[section.id]
        return (
          <div
            key={section.id}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <SectionCard
              section={section}
              isSelected={selectedSection === section.id}
              isAttackTarget={showAttackTarget && attackTarget === section.id}
              selectable={selectable}
              onClick={() => onSectionClick(section.id as SectionId)}
            />
          </div>
        )
      })}
    </div>
  )
}
