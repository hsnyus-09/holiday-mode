import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "HolidayMode",
      fileName: "holiday-mode",
      formats: ["es"]
    },
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      external: []
    }
  }
});
