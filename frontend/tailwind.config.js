/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#F9FAFB',
          100: '#111827', // text-primary (dark)
          200: '#1F2937', // dark grey
          300: '#374151', // medium dark grey
          400: '#4B5563', // text-secondary (medium grey)
          500: '#6B7280', // muted grey
          600: '#9CA3AF',
          700: '#D1D5DB', // light border
          800: '#C0C0C0', // main border
          900: '#F0F0F0', // surface / cards
          950: '#FFFFFF', // app background
        },
        nebula: {
          primary: "#FFFFFF",
          secondary: "#F0F0F0",
          accent: "#FFFFFF",
          background: "#FFFFFF",
          surface: "#F0F0F0",
          'text-primary': "#111827",
          'text-secondary': "#4B5563",
          border: "#C0C0C0",
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'nebula-card': '8px',
        'nebula-control': '8px',
      },
      spacing: {
        'nebula-base': '8px',
        'nebula-gap': '16px',
        'nebula-card': '24px',
        'nebula-section': '80px',
      },
      boxShadow: {
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.25)',
        'nebula-shadow': '0 4px 20px -2px rgba(17, 24, 39, 0.08), 0 2px 8px -1px rgba(17, 24, 39, 0.04)',
      }
    },
  },
  plugins: [],
}
