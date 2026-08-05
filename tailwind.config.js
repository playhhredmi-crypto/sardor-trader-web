/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0D12",
        panel: "#12161D",
        line: "#232935",
        text: "#E7EAEE",
        muted: "#7C8698",
        gold: "#E8B33D",
        bull: "#3ECF8E",
        bear: "#F0575E",
        trend: "#5B8DEF",
        fib: "#C084FC",
        fvg: "#22D3EE",
        structure: "#FF9F43",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
