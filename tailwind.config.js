/** @type {import('tailwindcss').Config} */
module.exports = {
  // ESTA LÍNEA ES EL MOTOR DE TODO. Sin esto, las clases dark: no existen.
  darkMode: 'class', 
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // Agregamos lib por si acaso
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#050505",
          card: "#0A0A0A",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.05)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}