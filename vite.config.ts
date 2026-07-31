import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        movie: resolve(import.meta.dirname, "movie.html"),
        theater: resolve(import.meta.dirname, "theater.html"),
      },
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
