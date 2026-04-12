/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    '#F5F5DC',
        panel:   '#D1BFA2',
        card:    '#C2A68D',
        border:  '#BFAF8D',
        green:   '#2d6a4f',
        red:     '#c0392b',
        blue:    '#C2A68D',
        yellow:  '#b7770d',
        muted:   '#6b5a45',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
