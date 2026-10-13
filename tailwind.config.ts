import type { Config } from "tailwindcss";

// Design tokens mirror the CSS variables in globals.css (dark Classical variant from the prototype).
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        text: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        divider: "var(--divider)",
        accent: { DEFAULT: "var(--accent)", hi: "var(--accent-hi)", deep: "var(--accent-deep)" },
        gain: "#7fb37a",
        out: "#e07b5a",
      },
      fontFamily: {
        heading: "var(--heading)",
        body: "var(--body)",
        mono: "var(--mono)",
      },
      borderRadius: { DEFAULT: "var(--r)", lg: "var(--r-lg)" },
      boxShadow: { panel: "var(--shadow)" },
    },
  },
  plugins: [],
} satisfies Config;
