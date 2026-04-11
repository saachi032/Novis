import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          green: "#557571",
          // yellow: "#EDE087",
          black: "#000000",
          gray: "#D9D9D9",
          white: "#FFFFFF",
          bg: "#FAFAF5",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 24px -8px rgba(0, 0, 0, 0.06)",
        card: "0 2px 40px -12px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
