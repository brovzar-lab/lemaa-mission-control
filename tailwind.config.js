/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        pulse_ring: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'amber-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        bounce: 'bounce 0.6s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        pulse_ring: 'pulse_ring 1.2s ease-out infinite',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'amber-pulse': 'amber-pulse 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
      colors: {
        void: '#080B14',
        base: '#0D1117',
        surface: '#161B27',
        elevated: '#1E2535',
      },
    },
  },
  plugins: [],
}
