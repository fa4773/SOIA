/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soia: {
          dark: '#08090C',
          panel: '#101218',
          card: '#161922',
          border: '#242938',
          accent: '#00F0FF',
          accentGlow: 'rgba(0, 240, 255, 0.15)',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          muted: '#8A94A6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
