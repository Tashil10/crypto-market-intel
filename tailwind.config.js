/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#fafafa",
        muted: "#a1a1aa",
        border: "#27272a",
        card: "#0a0a0a",
        theme: {
          DEFAULT: "#5ac8fa",
          muted: "#5ac8fa99",
          subtle: "#5ac8fa1a",
        },
        positive: {
          DEFAULT: "#34c759",
          muted: "#34c75999",
          subtle: "#34c7591a",
        },
        negative: {
          DEFAULT: "#ff3b30",
          muted: "#ff3b3099",
          subtle: "#ff3b301a",
        },
      },
      borderRadius: {
        card: "12px",
        "card-lg": "16px",
      },
      spacing: {
        section: "1.75rem",
        card: "1.5rem",
      },
    },
  },
  plugins: [],
};
