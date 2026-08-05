/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Kodexo Labs Visual Identity v1.0 — mirrors src/styles/tokens.css
        // 1:1 by name. Do not add colors here that aren't a CSS var there.
        "brand-red": "var(--brand-red)",
        "brand-red-deep": "var(--brand-red-deep)",
        "brand-red-tint": "var(--brand-red-tint)",
        "brand-black": "var(--brand-black)",
        "brand-white": "var(--brand-white)",

        "n-50": "var(--n-50)",
        "n-100": "var(--n-100)",
        "n-200": "var(--n-200)",
        "n-300": "var(--n-300)",
        "n-400": "var(--n-400)",
        "n-500": "var(--n-500)",
        "n-600": "var(--n-600)",
        "n-700": "var(--n-700)",
        "n-800": "var(--n-800)",
        "n-900": "var(--n-900)",
        "n-950": "var(--n-950)",

        "success-bg": "var(--success-bg)",
        "success-border": "var(--success-border)",
        "success-text": "var(--success-text)",
        "warning-bg": "var(--warning-bg)",
        "warning-border": "var(--warning-border)",
        "warning-text": "var(--warning-text)",
        "error-bg": "var(--error-bg)",
        "error-border": "var(--error-border)",
        "error-text": "var(--error-text)",
        "info-bg": "var(--info-bg)",
        "info-border": "var(--info-border)",
        "info-text": "var(--info-text)",

        "soft-blue": "var(--soft-blue)",
        "muted-green": "var(--muted-green)",
        "soft-amber": "var(--soft-amber)",
        "soft-purple": "var(--soft-purple)",

        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        "bg-elevated": "var(--bg-elevated)",
        border: "var(--border)",
        divider: "var(--divider)",

        "text-strong": "var(--text-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-on-brand": "var(--text-on-brand)",
      },
      backgroundImage: {
        "gradient-a": "var(--brand-gradient-a)",
        "gradient-b": "var(--brand-gradient-b)",
        "card-tint": "var(--card-tint)",
      },
      fontFamily: {
        "display-hyper": "var(--font-display-hyper)",
        "display-statement": "var(--font-display-statement)",
        display: "var(--font-display)",
        heading: "var(--font-heading)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      borderRadius: {
        "radius-sm": "var(--radius-sm)",
        "radius-md": "var(--radius-md)",
        "radius-lg": "var(--radius-lg)",
        "radius-xl": "var(--radius-xl)",
        "radius-pill": "var(--radius-pill)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
