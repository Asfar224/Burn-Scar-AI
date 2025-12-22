/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medical-blue': '#2563eb',
        'medical-teal': '#0d9488',
        'medical-gray': '#64748b',
        'soft-gray': '#f1f5f9',
      },
    },
  },
  plugins: [],
}

