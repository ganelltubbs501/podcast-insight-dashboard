/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF2D8D',
        secondary: '#5B2EFF',
        success: '#22C55E',
        error: '#EF4444',

        // Text tokens (dark mode values - will be overridden in light mode via CSS)
        textPrimary: '#FFFFFF',
        textBody: '#E6E6F0',
        textSecondary: '#B9B9CC',
        textMuted: '#8B8BA6',
        link: '#FF2D8D',
        linkHover: '#E60074',

        // Accent colors
        'accent-soft': '#FF2D8D',

        // Dark mode neutrals (override Tailwind grays)
        gray: {
          50: '#0B0B10',
          100: '#11111A',
          200: '#1A1A26',
          300: '#242438',
          400: '#3A3A55',
          500: '#5B5B78',
          600: '#8B8BA6',
          700: '#B9B9CC',
          800: '#E6E6F0',
          900: '#FFFFFF',
        },

        // Indigo → Purple depth
        indigo: {
          50: '#1A1028',
          700: '#5B2EFF',
          900: '#10081C',
        },

        // Blue → Pink system
        blue: {
          50: '#2A0B1A',
          100: '#3A0F24',
          200: '#5A1636',
          500: '#FF2D8D',
          600: '#FF2D8D',
          700: '#E60074',
          800: '#FFD1E6',
        },

        // Purple shades
        purple: {
          50: '#1A1028',
          200: '#3A235C',
          600: '#5B2EFF',
          900: '#0D0616',
        },

        // Green shades
        green: {
          50: '#071A12',
          100: '#0B2A1C',
          200: '#145234',
          600: '#22C55E',
          700: '#16A34A',
        },

        // Yellow/Amber shades
        yellow: {
          100: '#2A1F08',
          300: '#FBBF24',
          600: '#D97706',
          700: '#B45309',
        },
        amber: {
          50: '#241A07',
          200: '#7A4E12',
          600: '#F59E0B',
          800: '#FDE68A',
        },

        // Red shades
        red: {
          50: '#240A0A',
          100: '#3A1010',
          500: '#EF4444',
          700: '#B91C1C',
        },

        // Orange shades
        orange: {
          100: '#2A1408',
          700: '#FB923C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
