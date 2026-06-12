'use client'

import { useState } from 'react'
import { DEFENSE_CARDS, CURSED_CARDS, TRANSFORMATION_CARDS } from '@/game/cards'

const SECTIONS = [
  {
    label: '防衛カード',
    labelColor: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-950/30',
    imageBg: 'bg-blue-900/60',
    cards: DEFENSE_CARDS,
  },
  {
    label: '呪いカード',
    labelColor: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-950/30',
    imageBg: 'bg-purple-900/60',
    cards: CURSED_CARDS,
  },
  {
    label: '変身カード（裏切り者専用）',
    labelColor: 'text-red-400',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-950/30',
    imageBg: 'bg-red-900/60',
    cards: TRANSFORMATION_CARDS,
  },
]

export default function CardReference() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-white border border-dark-border px-2 py-1 rounded-lg transition-all hover:border-gray-500"
        title="カード一覧"
      >
        📖 カード一覧
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#12121e] border border-dark-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border flex-shrink-0">
              <h2 className="text-base font-bold text-amber-glow">📖 カード一覧</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 space-y-6">
              {SECTIONS.map((section) => (
                <div key={section.label}>
                  <h3 className={`text-sm font-bold mb-3 ${section.labelColor}`}>
                    {section.label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {section.cards.map((card) => (
                      <div
                        key={card.name}
                        className={`rounded-2xl border-2 ${section.borderColor} ${section.bgColor} flex flex-col`}
                      >
                        {/* Artwork with bezel */}
                        <div className="p-2 pb-0">
                          <div
                            className={`w-full rounded-xl overflow-hidden ${section.imageBg}`}
                            style={{ aspectRatio: '4/3' }}
                          >
                            <img
                              src={`/cards/${card.effect}.png`}
                              alt={card.nameJa}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2 pt-1.5">
                          <div className={`text-[9px] font-bold mb-0.5 ${section.labelColor}`}>
                            {section.label.replace('カード（裏切り者専用）', '').replace('カード', '')}
                          </div>
                          <div className="text-xs font-bold text-white leading-tight mb-1">
                            {card.nameJa}
                          </div>
                          <div className="text-[9px] text-gray-400 leading-snug">
                            {card.descriptionJa}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
