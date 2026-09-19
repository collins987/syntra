/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#080A0F",
          surface: "#0D1117",
          elevated: "#121821",
          overlay: "#1A2332",
        },
        border: {
          subtle: "#1E2935",
          DEFAULT: "#263342",
          strong: "#344556",
        },
        text: {
          primary: "#F5F7FA",
          secondary: "#8B98A8",
          muted: "#586474",
          disabled: "#3A4A5C",
        },
        cyan: {
          50: "#E6FFFE",
          100: "#CCFFFE",
          200: "#99FFFE",
          300: "#66FFFD",
          400: "#33FFFC",
          500: "#00E5FF",
          600: "#00B8CC",
          700: "#008A99",
          800: "#005D66",
          900: "#002F33",
        },
        violet: {
          300: "#A78BFA",
          400: "#8B5CF6",
          500: "#7C3AED",
        },
        success: {
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        warning: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        error: {
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,41,53,0.8)",
        glow: "0 0 20px rgba(0,229,255,0.15)",
        "glow-sm": "0 0 8px rgba(0,229,255,0.2)",
        modal: "0 25px 50px rgba(0,0,0,0.7)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "flow": "flow 2s linear infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        // Motion that explains what the system is doing: a line drawing itself
        // as data arrives, a pulse travelling down a connection, a card that
        // breathes. Not decoration for its own sake.
        draw: "draw 1.8s ease-out forwards",
        rise: "slideUp 0.5s ease-out backwards",
        drift: "drift 7s ease-in-out infinite",
        trace: "trace 3.5s linear infinite",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        flow: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        draw: {
          from: { strokeDashoffset: "260" },
          to: { strokeDashoffset: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        trace: {
          "0%": { backgroundPosition: "-60% 0" },
          "100%": { backgroundPosition: "160% 0" },
        },
      },
    },
  },
  plugins: [],
}
