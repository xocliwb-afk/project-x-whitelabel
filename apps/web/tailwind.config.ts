import type { Config } from "tailwindcss";
import brand from "../../config/brand.json";

const { colors, typography, radius } = brand.theme;

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        "primary-foreground": colors.primaryForeground,
        "primary-accent": colors.primaryAccent,
        background: colors.background,
        surface: {
          DEFAULT: colors.surface,
          muted: colors.surfaceMuted,
          accent: colors.surfaceAccent,
        },
        text: {
          secondary: colors.textSecondary,
        },
        "text-main": colors.textMain,
        "text-muted": colors.textMuted,
        border: colors.border,
        danger: colors.danger,
        success: colors.success,
      },
      fontFamily: {
        sans: typography.fontFamily.split(",").map((s: string) => s.trim()),
      },
      borderRadius: {
        card: `${radius.card}px`,
        button: `${radius.button}px`,
        input: `${radius.input}px`,
      },
    },
  },
  plugins: [],
};
export default config;
