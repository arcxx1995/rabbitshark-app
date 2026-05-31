/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: "#020202",
      green: "#00FFAB",
      white: "#FCF8F8",
      ink: "var(--color-black)",
      sand: "var(--color-white)",
      shell: "var(--color-white)",
      tide: "var(--color-green)",
      foam: "var(--color-white)",
      coral: "var(--color-green)",
      red: {
        100: "#ffe8eb",
        200: "#ffc7cf",
        300: "#ff98a6",
        400: "#ff6b7d",
        500: "#ff4159",
      },
      sky: {
        400: "#FCF8F8",
      },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-gertika)", "TT Gertika", "Arial", "sans-serif"],
        sans: ["var(--font-gertika)", "TT Gertika", "Arial", "sans-serif"],
      },
      colors: {
        room: {
          950: "#020202",
          900: "#070a09",
          800: "#0d1210",
        },
        felt: {
          900: "#021a12",
          800: "#003d29",
          700: "#00b87d",
          500: "#00FFAB",
        },
        gold: {
          500: "#00FFAB",
          400: "#00FFAB",
          300: "#73ffd0",
        },
        danger: {
          500: "#ff4159",
        },
      },
      boxShadow: {
        table: "0 45px 130px rgba(0,0,0,.72), inset 0 0 80px rgba(0,255,171,.08)",
        card: "0 16px 42px rgba(0,0,0,.38)",
        glow: "0 0 42px rgba(0,255,171,.28)",
        tide: "0 24px 90px rgba(0,0,0,.72)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 50% 0%, color-mix(in srgb, #00FFAB 20%, transparent), transparent 34%), linear-gradient(180deg, #020202, #020202)",
        felt: "radial-gradient(circle at 50% 45%, rgba(0,255,171,.18), rgba(0,46,31,.78) 42%, rgba(2,2,2,1) 78%)",
        room: "radial-gradient(circle at 50% 0%, rgba(0,255,171,.18), transparent 34%), linear-gradient(180deg, #020202 0%, #020202 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
