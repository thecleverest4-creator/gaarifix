/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8ECF1',
          100: '#C9D2DD',
          200: '#93A5BD',
          300: '#5E78A0',
          400: '#34517D',
          500: '#1E3A5F',
          600: '#16294A',
          700: '#101C2C',
          800: '#0C1620',
          900: '#080F16',
        },
        orange: {
          50: '#FFF1E8',
          100: '#FFE0CC',
          200: '#FFC299',
          300: '#FFA566',
          400: '#FF914D',
          500: '#FF7A30',
          600: '#E6621A',
          700: '#BF4E14',
          800: '#993E10',
          900: '#732E0C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,28,44,0.06), 0 4px 16px rgba(16,28,44,0.06)',
        cardHover: '0 4px 8px rgba(16,28,44,0.08), 0 12px 32px rgba(16,28,44,0.10)',
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
