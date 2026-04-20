/** @type {import('tailwindcss').Config} */
export default {
  // This 'content' section is usually what goes missing!
  // It tells Tailwind exactly which files to scan for your styles.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}