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
  plugins: []
};
