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
        bg: "var(--bg)",
        card: "var(--card-bg)",
        text: "var(--text)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        office: {
          DEFAULT: "var(--office)",
          border: "var(--office-border)",
          text: "var(--office-text)",
        },
        remote: {
          DEFAULT: "var(--remote)",
          border: "var(--remote-border)",
          text: "var(--remote-text)",
        },
        absent: {
          DEFAULT: "var(--absent)",
          border: "var(--absent-border)",
          text: "var(--absent-text)",
        },
      },
    },
  },
  plugins: [],
};
export default config;