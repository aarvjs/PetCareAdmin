/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        foreground: "#25242A",
        primaryPurple: "#7567E8",
        primarySky: "#72CFF2",
        lightSky: "#EAF8FE",
        softLavender: "#F1EEFF",
        mint: "#DFF7EE",
        secondaryText: "#737780",
        borderColor: "#E8ECF0",
        success: "#35B779",
        warning: "#F2B84B",
        error: "#E46A6A",
      },
    },
  },
  plugins: [],
};

export default config;
