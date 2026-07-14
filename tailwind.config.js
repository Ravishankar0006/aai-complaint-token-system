/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        airport: {
          bg: "#030712",
          card: "#0b0f19",
          cardHover: "#111827",
          accent: "#3b82f6",
          accentHover: "#2563eb",
          accentLight: "#60a5fa",
          accentMuted: "#1e3a5f",
          success: "#10b981",
          successMuted: "#064e3b",
          warning: "#f59e0b",
          warningMuted: "#78350f",
          danger: "#ef4444",
          dangerMuted: "#7f1d1d",
          border: "#1e293b",
          borderLight: "#334155",
          textPrimary: "#f1f5f9",
          textSecondary: "#94a3b8",
          textMuted: "#64748b",
          surface: "#0f172a",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-subtle": "pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "swing": "swing 1s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.7 },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "swing": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(15deg)" },
          "75%": { transform: "rotate(-15deg)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.6)" },
        },
      },
      boxShadow: {
        "glow-blue": "0 0 15px rgba(59, 130, 246, 0.15)",
        "glow-emerald": "0 0 15px rgba(16, 185, 129, 0.15)",
        "glow-rose": "0 0 15px rgba(239, 68, 68, 0.15)",
        "glow-amber": "0 0 15px rgba(245, 158, 11, 0.15)",
        "card": "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.2)",
        "elevated": "0 10px 40px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
}
