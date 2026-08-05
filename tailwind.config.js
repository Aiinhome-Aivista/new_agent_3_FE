// Force rebuild
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#FF5A14',
        'button-orange': '#FF7A45',
        'hover-orange': '#F56B2F',
        'sidebar': '#4A4A4A',
        'light-background': '#FFFFFF',
        'input-background': '#FFF7F2',
        'light-border': '#D8D8D8',
        'orange-border': '#FF8A55',
        'primary-text': '#666666',
        'secondary-text': '#888888',
        'placeholder': '#B0B0B0',
        'white': '#FFFFFF',
      },
      animation: {
        blob: "blob 7s infinite",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },
    },
  },
  plugins: [],
}
