/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      colors: {
        room: {
          950: "#050706",
          900: "#07110d",
          800: "#0b1913",
        },
        felt: {
          900: "#06291f",
          800: "#0b4b35",
          700: "#10734d",
          500: "#20b26f",
        },
        gold: {
          500: "#d8b968",
          400: "#f2d78b",
        },
        danger: {
          500: "#f05d5e",
        },
      },
      boxShadow: {
        table: "0 45px 130px rgba(0,0,0,.65), inset 0 0 80px rgba(255,255,255,.08)",
        card: "0 16px 40px rgba(0,0,0,.32)",
        glow: "0 0 42px rgba(32,178,111,.32)",
      },
      backgroundImage: {
        felt: "radial-gradient(circle at 50% 45%, rgba(44,185,119,.28), rgba(7,64,46,.7) 42%, rgba(3,26,20,1) 76%)",
        room: "radial-gradient(circle at 50% 10%, rgba(41,90,72,.45), transparent 33%), radial-gradient(circle at 12% 70%, rgba(216,185,104,.14), transparent 28%), linear-gradient(135deg, #050706 0%, #07110d 46%, #0b1913 100%)",
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
