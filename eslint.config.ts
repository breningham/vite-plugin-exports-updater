import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["dist/", "playground/"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.test.ts"], // Target test files
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable the rule for test files
    },
  },
]);
