import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;


/*
black: "#000000",
        blueDark: "#0066cc",
        blue: "#0071e3",
        grayDark: "#6e6e73",
        brownDark: "#100706",
        lightBlue: "#c7e6f1",
        grayLight: "#cdc7c7",
        grayMedium: "#d2d2d7",
        grayLighter: "#e6e6e6",
        blueLightest: "#f4f8fb",
        grayLightest: "#f5f5f7",
        whiteLight: "#fafafc",
        white: "#ffffff",
        blackDark: "#1d1d1f",
        blueDarker: "#2047b6",
        blackDarker: "#040303",
        blueBright: "#2997ff",
        grayDarker: "#333336",
        grayDarkest: "#6a6a6a",
        grayMediumLight: "#b0b0b0",
        grayLightMedium: "#dddddd",
        grayLightest2: "#f7f7f7",
        red: "#ff385c",
        blackMedium: "#222222" fdsf8098 785698 */
