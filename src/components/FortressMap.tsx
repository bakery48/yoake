'use client'

import { ReactNode } from 'react'

interface Props {
  className?: string
  children?: ReactNode
}

export default function FortressMap({ className = '', children }: Props) {
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-dark-border ${className}`}
      style={{
        backgroundImage: 'url(/map.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1c1917',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      {children && (
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 flex justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent">
          {children}
        </div>
      )}
    </div>
  )
}
