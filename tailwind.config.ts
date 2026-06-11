import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0f',
        'dark-card': '#12121a',
        'dark-border': '#2a2a3a',
        'amber-glow': '#f59e0b',
        'gold-light': '#fcd34d',
        'crimson': '#dc2626',
        'teal-glow': '#0d9488',
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px #f59e0b44' },
          '50%': { boxShadow: '0 0 20px #f59e0b88' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
