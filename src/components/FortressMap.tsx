'use client'

import Image from 'next/image'
import { Section, SectionId } from '@/game/types'
import SectionCard from './SectionCard'

// Position of each section on the map image (percentage of image width/height)
// Adjust these after placing your map image to align with the illustrated locations
const SECTION_POSITIONS: Record<SectionId, { x: number; y: number }> = {
  watchtower: { x: 44, y:  4 }, // top center
  gate:       { x: 44, y: 68 }, // bottom center
  armory:     { x: 72, y: 32 }, // right side
  barracks:   { x:  4, y: 32 }, // left side
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
    <div className="relative w-full rounded-2xl overflow-hidden border border-dark-border"
         style={{ aspectRatio: '16/9' }}>

      {/* Map background (place your image at public/map.png) */}
      <Image
        src="/map.png"
        alt="砦マップ"
        fill
        className="object-cover"
        priority
        onError={(e) => {
          // Hide broken image icon if file not found
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Fallback background when map.png is not yet present */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900" />

      {/* Dark overlay to help cards stand out */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Section cards positioned on the map */}
      {sections.map((section) => {
        const pos = SECTION_POSITIONS[section.id]
        return (
          <div
            key={section.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
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
