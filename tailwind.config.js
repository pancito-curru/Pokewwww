/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: { pixel: ['"Press Start 2P"', 'monospace'] },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        flip: {
          '0%': { transform: 'perspective(400px) rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'perspective(400px) rotateX(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        flip: 'flip 0.45s ease-out both',
        shake: 'shake 0.35s ease-in-out',
        pop: 'pop 0.3s ease-out',
      },
      colors: {
        type: {
          normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', grass: '#7AC74C',
          electric: '#F7D02C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
          ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
          rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
          steel: '#B7B7CE', fairy: '#D685AD',
        },
      },
    },
  },
  plugins: [],
};
