/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      maxWidth: {
        fill: '-webkit-fill-available',
      },
      maxHeight: {
        fill: '-webkit-fill-available',
      },
    },
  },
  plugins: [],
};

