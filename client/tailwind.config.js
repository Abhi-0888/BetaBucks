/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NidhiKosh — Sanskrit-Cyber Palette
        primary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',   // Saffron Gold
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        accent: {
          // Cyber teal for secondary accents
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          // Success / Error
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
        },
        dark: {
          950: '#020617',   // Deepest void
          900: '#0a0e1a',   // Primary bg — near-black with blue tint
          850: '#0f1629',
          800: '#131b2e',   // Card bg
          700: '#1e293b',   // Borders
          600: '#334155',
          500: '#64748b',   // Muted text
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        saffron: {
          DEFAULT: '#ff9933',
          light: '#ffb366',
          dark: '#cc7a29',
          glow: 'rgba(255, 153, 51, 0.15)',
        },
        profit: {
          DEFAULT: '#22c55e',
          light: '#86efac',
          dark: '#15803d',
        },
        loss: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#b91c1c',
        },
        vyuha: {
          gold: '#d4a843',
          bronze: '#cd7f32',
          copper: '#b87333',
          sacred: '#ff6b35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-green': 'flashGreen 0.5s ease-out',
        'flash-red': 'flashRed 0.5s ease-out',
        'ticker': 'ticker 40s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'slideUp': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 153, 51, 0.2), 0 0 20px rgba(255, 153, 51, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(255, 153, 51, 0.4), 0 0 40px rgba(255, 153, 51, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,153,51,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,51,0.03) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at center, rgba(255,153,51,0.08) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
