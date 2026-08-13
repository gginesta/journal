import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm Album redesign tokens (docs/DESIGN_HANDOFF.md). Rose stays deep
        // enough to pass WCAG AA on its own 10% tint and the page background
        // (see AUDIT_UX.md UX-T2); dark variants are the warm-charcoal scheme.
        rose: { DEFAULT: "#ad3145", pressed: "#96293c", dark: "#e0798c" },
        leaf: { DEFAULT: "#367a63", deep: "#2a5f4d", dark: "#7dbb9e" },
        dawn: "#f5a37a",
        ink: "#212128",
        "soft-ink": "#47454a",
        "warm-gray": "#786e63",
        mist: "#eff1ed",
        journal: {
          bg: "#faf5ed",
          surface: "#fffdf8",
          raised: "#fbf2e8",
          line: "rgba(33, 33, 40, 0.08)",
          "dark-bg": "#211d1a",
          "dark-surface": "#2a2521",
          "dark-raised": "#342e28",
          "dark-line": "rgba(243, 237, 228, 0.10)",
          "dark-ink": "#f3ede4",
          "dark-soft": "#d6cec2",
          "dark-gray": "#a89c8d"
        }
      },
      boxShadow: {
        card: "0 8px 26px rgba(66, 48, 35, 0.07)",
        journal: "0 20px 54px rgba(66, 48, 35, 0.14)",
        photo: "0 18px 38px rgba(66, 48, 35, 0.22)"
      },
      borderRadius: {
        control: "14px",
        card: "16px",
        journal: "22px",
        hero: "28px"
      }
    }
  },
  plugins: []
};

export default config;
