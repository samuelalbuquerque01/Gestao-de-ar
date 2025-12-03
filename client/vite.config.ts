import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  
  build: {
    // MUDEI: de "../dist/public" para "../dist"
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
  
  server: {
    port: 5000,
    host: "0.0.0.0",
  },
});