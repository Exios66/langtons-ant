import { defineConfig } from "vite";

export default defineConfig({
  // Deployed as a GitHub Pages project site: exios66.github.io/langtons-ant/
  base: "/langtons-ant/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
