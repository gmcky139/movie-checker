import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "coverage/", "src/data/generated.json"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts", "vite.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);
