/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'sans-serif'],
        technical: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        kal: {
          bg: '#050508',
          surface: '#0a0a0f',
          'surface-alt': '#12121a',
          accent: '#00A6FF',
          danger: '#FF2B2B',
          border: 'rgba(255, 255, 255, 0.05)',
          text: '#E0E0E0',
          'text-muted': '#A0A0A0',
          'text-disabled': 'rgba(255, 255, 255, 0.3)',
        },
      }
    },
  },
  plugins: [],
}
