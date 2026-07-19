import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral surface — cool gray, Stripe-like
        canvas: "#f6f8fb",
        surface: "#ffffff",
        ink: {
          DEFAULT: "#0a2540", // Stripe deep navy text
          soft: "#425466",
          faint: "#8898aa",
        },
        line: "#e6e9ef",
        accent: {
          DEFAULT: "#10b981", // emerald
          soft: "#ecfdf5",
          ink: "#047857",
        },
        danger: { DEFAULT: "#ef4444", soft: "#fef2f2", ink: "#b91c1c" },
        warn: { DEFAULT: "#f59e0b", soft: "#fffbeb", ink: "#b45309" },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,37,64,0.04), 0 4px 12px rgba(10,37,64,0.06)",
        pop: "0 8px 24px rgba(10,37,64,0.12)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["12px", "1.4"],
        sm: ["13px", "1.5"],
        base: ["15px", "1.6"],
        lg: ["18px", "1.5"],
        xl: ["22px", "1.3"],
        "2xl": ["28px", "1.2"],
        "3xl": ["34px", "1.15"],
      },
      spacing: {
        "1u": "4px",
        "4u": "16px",
        "9u": "36px",
      },
    },
  },
  plugins: [],
};

export default config;
