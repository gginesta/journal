import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep enough to pass WCAG AA on its own 10% tint and the page
        // background (see AUDIT_UX.md UX-T2); was #c7455c at 4.08:1; #ad3145 clears the raised-background chips too.
        rose: "#ad3145",
        ink: "#212128",
        "soft-ink": "#47454a",
        "warm-gray": "#786e63",
        mist: "#eff1ed",
        leaf: "#367a63",
        dawn: "#f5a37a",
        journal: {
          bg: "#faf5ed",
          surface: "#fffdf8",
          raised: "#fbf2e8",
          line: "rgba(33, 33, 40, 0.08)"
        }
      },
      boxShadow: {
        journal: "0 20px 54px rgba(66, 48, 35, 0.14)",
        photo: "0 18px 38px rgba(66, 48, 35, 0.22)"
      },
      borderRadius: {
        journal: "22px"
      }
    }
  },
  plugins: []
};

export default config;
