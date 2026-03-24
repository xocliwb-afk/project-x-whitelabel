import type { Config } from "tailwindcss";

/** Helper: reference a CSS custom property as an RGB color with Tailwind opacity support */
function brandColor(varName: string) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: brandColor("--brand-primary"),
        "primary-foreground": brandColor("--brand-primary-foreground"),
        "primary-accent": brandColor("--brand-primary-accent"),
        background: brandColor("--brand-background"),
        surface: {
          DEFAULT: brandColor("--brand-surface"),
          muted: brandColor("--brand-surface-muted"),
          accent: brandColor("--brand-surface-accent"),
        },
        text: {
          secondary: brandColor("--brand-text-secondary"),
        },
        "text-main": brandColor("--brand-text-main"),
        "text-muted": brandColor("--brand-text-muted"),
        border: brandColor("--brand-border"),
        danger: brandColor("--brand-danger"),
        success: brandColor("--brand-success"),
      },
      fontFamily: {
        sans: ["var(--brand-font-family)"],
      },
      borderRadius: {
        card: "var(--brand-radius-card)",
        button: "var(--brand-radius-button)",
        input: "var(--brand-radius-input)",
      },
    },
  },
  plugins: [],
};
export default config;
