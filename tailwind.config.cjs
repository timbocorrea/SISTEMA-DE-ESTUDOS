/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './domain/**/*.{ts,tsx}',
    './repositories/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        lexend: ['Lexend', 'Inter', 'sans-serif'],
        sans: ['Lexend', 'Inter', 'sans-serif']
      }
    }
  },
  safelist: [
    // Classes de espaçamento para blocos de conteúdo
    'mb-0',
    'mb-2',
    'mb-4',
    'mb-6',
    'mb-8',
    'mb-12',
    'mb-16',
    'mb-24'
  ],
  plugins: []
};
