/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Segoe UI", "Arial", "sans-serif"],
      serif: ["Segoe UI", "Arial", "sans-serif"],
      mono: ["Segoe UI", "Arial", "sans-serif"],
      display: ["Segoe UI", "Arial", "sans-serif"],
      body: ["Segoe UI", "Arial", "sans-serif"],
    },
    extend: {
      fontFamily: {
        display: ["Segoe UI", "Arial", "sans-serif"],
        body: ["Segoe UI", "Arial", "sans-serif"],
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
    extend: {},
  },
  plugins: [],
};
