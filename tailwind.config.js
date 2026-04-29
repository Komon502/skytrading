/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          950: '#060d1a',
          900: '#0a1628',
          800: '#0f2040',
          700: '#153058',
          600: '#1b4070',
          500: '#2255a0',
          400: '#3b7fd4',
          300: '#7ab5ea',
          200: '#b5d4f4',
          100: '#deedf9',
        },
        accent: '#3b7fd4',
        green: {
          trade: '#00d084',
        },
        red: {
          trade: '#ff4757',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(59,127,212,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,127,212,0.05) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
