import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project from a subfolder (/hershey-02/), while
// Netlify and local dev serve it from the root. The Pages workflow sets
// VITE_BASE_PATH; everything else falls through to "/".
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
});
