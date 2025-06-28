/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'midnight-navy': '#0D1B2A',
        'charcoal-gray': '#1B263B',
        'off-white': '#E0E1DD',
        'cool-gray': '#A9A9B3',
        'sapphire-blue': '#3366CC',
        'regal-purple': '#5E4B8B',
        'deep-bronze': '#A67C52',
        'emerald': '#3CB371',
        'legal-red': '#B00020',
      },
      backgroundColor: {
        'primary': '#0D1B2A',
        'surface': '#1B263B',
        'accent': '#3366CC',
        'success': '#3CB371',
        'error': '#B00020',
      },
      textColor: {
        'primary': '#E0E1DD',
        'secondary': '#A9A9B3',
        'accent': '#3366CC',
        'success': '#3CB371',
        'error': '#B00020',
      },
      borderColor: {
        'primary': '#1B263B',
        'secondary': '#3366CC',
        'accent': '#5E4B8B',
      },
      boxShadow: {
        'legal': '0 4px 6px -1px rgba(13, 27, 42, 0.1), 0 2px 4px -1px rgba(13, 27, 42, 0.06)',
        'legal-lg': '0 10px 15px -3px rgba(13, 27, 42, 0.1), 0 4px 6px -2px rgba(13, 27, 42, 0.05)',
      },
    },
  },
  plugins: [],
};