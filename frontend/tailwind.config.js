/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'obsidian': '#000000',
        'surface': '#131313',
        'surface-high': '#201f1f',
        'surface-highest': '#2c2c2c',
        'neon-cyan': '#00F2FF',
        'neon-magenta': '#FF00E5',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 242, 255, 0.4)',
        'neon-magenta': '0 0 20px rgba(255, 0, 229, 0.4)',
      }
    },
  },
  plugins: [],
}
