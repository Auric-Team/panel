/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',
          card: '#0f172a',
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#06b6d4',
          emerald: '#10b981',
        },
      },
      boxShadow: {
        'glow-purple': '0 0 25px rgba(168, 85, 247, 0.4)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.4)',
        'glow-pink': '0 0 25px rgba(236, 72, 153, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
