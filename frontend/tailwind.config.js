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
        "primary": "#4f46e5",
        "primary-container": "#4338ca",
        "on-primary": "#ffffff",
        "secondary": "#6366f1",
        "secondary-container": "#e0e7ff",
        "on-secondary-container": "#3730a3",
        "tertiary": "#f59e0b",
        "tertiary-container": "#fef3c7",
        "on-tertiary-container": "#92400e",
        "background": "#f8fafc",
        "surface": "#ffffff",
        "surface-container": "#f1f5f9",
        "outline": "#cbd5e1",
        "outline-variant": "#e2e8f0",
        "on-background": "#0f172a",
        "on-surface": "#1e293b",
        "on-surface-variant": "#475569",
        "error": "#ef4444",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b"
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "xl": "48px",
        "margin": "32px",
        "lg": "32px",
        "md": "24px",
        "sm": "16px",
        "gutter": "24px",
        "base": "4px",
        "xs": "8px"
      },
      fontFamily: {
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "h2": ["Inter", "sans-serif"],
        "h3": ["Inter", "sans-serif"],
        "h1": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", {"lineHeight": "1.5", "fontWeight": "400"}],
        "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}],
        "h2": ["30px", {"lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "h3": ["24px", {"lineHeight": "1.3", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "h1": ["36px", {"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "label-sm": ["12px", {"lineHeight": "1", "fontWeight": "600"}],
        "body-sm": ["14px", {"lineHeight": "1.5", "fontWeight": "400"}],
        "label-md": ["14px", {"lineHeight": "1", "fontWeight": "500"}]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
