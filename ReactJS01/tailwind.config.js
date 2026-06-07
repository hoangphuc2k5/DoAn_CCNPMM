/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        ink: "#0b0d11",
        paper: "#f4f1ed",
        clay: "#f1e2cf",
        reef: "#2a5757",
        ember: "#c2531a",
      },
      boxShadow: {
        glow: "0 18px 60px rgba(12, 18, 26, 0.22)",
      },
    },
  },
  plugins: [],
};
