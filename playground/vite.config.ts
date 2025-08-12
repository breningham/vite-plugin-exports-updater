import { defineConfig } from "vite";
import updateExports from "vite-plugin-exports-updater";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [updateExports()],
  build: {
    lib: {
      entry: {
        index: join(__dirname, "./lib/index.ts"),
        "other-entry-point": join(__dirname, "./lib/index.ts"),
        "another-entry-point": join(__dirname, "./lib/index.ts"),
      },
    },
  },
});
