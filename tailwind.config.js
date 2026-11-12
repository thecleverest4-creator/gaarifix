/** @type {import('tailwindcss').Config} */
// GaariFix palette: charcoal (navy scale) + racing red (orange scale).
// Green/amber/gold/blue/indigo are mapped onto these so no default colours leak in.
const charcoal = {
  50: '#F4F4F5', 100: '#E4E4E7', 200: '#C4C4CA', 300: '#9B9BA3', 400: '#6B6B75',
  500: '#3F3F48', 600: '#2E2E36', 700: '#1C1C22', 800: '#131317', 900: '#0B0B0E',
};
const racingRed = {
  50: '#FDF2F2', 100: '#FADCDC', 200: '#F5B5B5', 300: '#EE8A8A', 400: '#E45656',
  500: '#D62828', 600: '#B11E1E', 700: '#8C1717', 800: '#6B1212', 900: '#4A0C0C',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: charcoal,
        orange: racingRed,
        gold: racingRed,
        green: racingRed,
        amber: racingRed,
        blue: charcoal,
        indigo: charcoal,
        gray: {
          50: '#F7F7F8', 100: '#EFEFF1', 200: '#E2E2E6', 300: '#CACAD0', 400: '#A1A1AA',
          500: '#71717A', 600: '#52525B', 700: '#3F3F46', 800: '#27272A', 900: '#18181B',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,11,14,0.06), 0 4px 16px rgba(11,11,14,0.06)',
        cardHover: '0 4px 8px rgba(11,11,14,0.08), 0 12px 32px rgba(11,11,14,0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
