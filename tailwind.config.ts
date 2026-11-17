import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tinta: {
          DEFAULT: "#16324F",
          hover: "#0F243A",
        },
        cuerpo: "#243447",
        celeste: {
          DEFAULT: "#75AADB",
          dark: "#5289BD",
          light: "#F3F8FC",
        },
        sol: "#F6C445",
        cielo: "#F3F8FC",
        borde: "#E2EAF2",
        brand: {
          DEFAULT: "#16324F",
          hover: "#0F243A",
          light: "#F3F8FC",
          muted: "#E2EAF2",
        },
      },
    },
  },
  plugins: [],
};

export default config;
