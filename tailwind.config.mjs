/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom Colors - Neon Palette
      colors: {
        neon: {
          green: '#39ff14',
          blue: '#38bdf8',
          purple: '#a78bfa',
          cyan: '#0ff0fc',
        },
        dark: {
          bg: '#0d0f11',
          secondary: '#15171a',
          card: '#1b1d21',
        },
      },
      
      // Custom Breakpoints
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      
      // Typography
      fontFamily: {
        sans: ['Geist', 'Inter', 'Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['Fira Mono', 'Geist Mono', 'monospace'],
      },
      
      // Custom Animations
      animation: {
        'glow': 'neonGlow 2.8s infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
      },
      
      keyframes: {
        neonGlow: {
          'from': {
            textShadow: '0 0 8px #38ffc1, 0 0 20px #10ffbb',
          },
          'to': {
            textShadow: '0 0 16px #3fffc7, 0 0 36px #14ffc9',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          'from': { transform: 'translateY(-20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      
      // Custom Box Shadows
      boxShadow: {
        'neon-green': '0 0 16px #39ff14a0',
        'neon-blue': '0 0 16px #38bdf880',
        'neon-cyan': '0 0 16px #0ff0fc90',
        'neon-purple': '0 0 16px #a78bfa70',
        'glow': '0 0 20px rgba(57, 255, 20, 0.5)',
        'glow-lg': '0 0 40px rgba(57, 255, 20, 0.6)',
      },
      
      // Custom Border Radius
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      
      // Custom Backdrop Blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      
      // Custom Spacing
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      
      // Custom Z-Index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Custom Transitions
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
        '3000': '3000ms',
      },
      
      // Custom Grid Template Columns
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};
