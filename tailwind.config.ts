import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ofna: {
          green: '#16A34A',
          greenLight: '#22C55E',
          dark: '#1F2937',
          light: '#F3F4F6',
          danger: '#EF4444',
          white: '#FFFFFF',
        },
      },
      borderRadius: {
        xl2: '20px',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(31, 41, 55, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;