'use client'

interface Props {
  className?: string
}

export default function FortressMap({ className = '' }: Props) {
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
    </div>
  )
}
