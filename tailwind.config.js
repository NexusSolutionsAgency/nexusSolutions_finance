/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nx: {
          bg: '#050a15',
          surface: '#0a1628',
          card: '#0f1d32',
          'card-hover': '#142544',
          border: '#1b2a45',
          'border-light': '#26375a',
          text: '#e2e8f0',
          muted: '#94a3b8',
          heading: '#f8fafc',
          blue: '#2563eb',
          'blue-light': '#3b82f6',
          'blue-dark': '#1d4ed8',
          gold: '#f59e0b',
          'gold-light': '#fbbf24',
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          gray: '#64748b',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(37, 99, 235, 0.15)',
      },
    },
  },
  plugins: [],
};
