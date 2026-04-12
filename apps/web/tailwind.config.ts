import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          light: '#60A5FA',
          lighter: '#DBEAFE',
          dark: '#1D4ED8',
        },
        background: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        escalated: '#EA580C',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
