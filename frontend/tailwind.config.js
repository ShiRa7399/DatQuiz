/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8e1',
          100: '#ffecb3',
          500: '#f57c00',
          600: '#fb8c00',
          700: '#e65c00',
          800: '#d85000',
          900: '#bf3600',
        },
        cream: {
          50: '#fcf8f2',
          100: '#f6ebd8',
          200: '#ede0c8',
        },
        orange: {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffb300',
          600: '#fb8c00',
          700: '#e65c00',
          800: '#d85000',
          900: '#bf3600',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
