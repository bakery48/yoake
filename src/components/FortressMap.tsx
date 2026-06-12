'use client'

import { Section, SectionId } from '@/game/types'
import SectionCard from './SectionCard'

// Display order for the card row
const SECTION_ORDER: SectionId[] = ['watchtower', 'gate', 'armory', 'barracks']

// Slight rotation per card for a "pinned to map" feel
const CARD_ROTATIONS: Record<SectionId, number> = {
  watchtower: -2,
  gate:        1,
  armory:     -1,
  barracks:    2,
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
  const ordered = SECTION_ORDER.map((id) => sections.find((s) => s.id === id)!)

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-dark-border"
      style={{
        backgroundImage: 'url(/map.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1c1917',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Card row */}
      <div className="relative z-10 flex justify-center items-end gap-4 px-6 py-6">
        {ordered.map((section) => (
          <div
            key={section.id}
            style={{ transform: `rotate(${CARD_ROTATIONS[section.id]}deg)` }}
            className="transition-transform duration-200 hover:rotate-0 hover:scale-105 hover:-translate-y-2"
          >
            <SectionCard
              section={section}
              isSelected={selectedSection === section.id}
              isAttackTarget={showAttackTarget && attackTarget === section.id}
              selectable={selectable}
              onClick={() => onSectionClick(section.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
