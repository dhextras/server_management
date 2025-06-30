/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: {
          400: "#7d56f4",
          500: "#7d56f4",
        },
        red: {
          400: "#ff6b6b",
        },
        emerald: {
          400: "#04B575",
        },
        gray: {
          300: "#ddd",
          500: "#666",
          600: "#333",
          700: "#444",
          800: "#222",
        },
        zinc: {
          900: "#1a1a1a",
        },
        black: "#0a0a0a",
      },
    },
  },
  plugins: [],
};
