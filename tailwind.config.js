/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        abha: {
          green:       '#1B5E20',  // أخضر أبها الجبلي (رئيسي)
          greenLight:  '#2E7D32',  // أخضر فاتح
          gold:        '#C9A227',  // ذهبي
          water:       '#0288D1',  // أزرق ماء السباحة
          bg:          '#F5F7FA',  // خلفية فاتحة
        },
      },
    },
  },
  plugins: [],
}