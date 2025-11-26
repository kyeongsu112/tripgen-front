/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        navbar: "var(--navbar)",
        "navbar-border": "var(--navbar-border)",
      },
    },
  },
  plugins: [],
};
