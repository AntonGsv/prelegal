import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
  },
  resolve: {
    alias: {
      "@/lib/*": path.resolve(__dirname, "./src/lib/*"),
      "@/types/*": path.resolve(__dirname, "./src/types/*"),
      "@/components/*": path.resolve(__dirname, "./components/*"),
      "@/components": path.resolve(__dirname, "./components"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
