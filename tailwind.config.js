/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brandPrimary: '#821910', // maroon
        brandNavy: '#243169',    // deep navy
        brandMuted: '#f6f7fb',
        brandBorder: '#e6e7ef'
      }
    }
  },
  plugins: []
};