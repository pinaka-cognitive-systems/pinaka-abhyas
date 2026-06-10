// ESLint flat config (ESLint 9+). Replaces .eslintrc.* entirely.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JS recommended rules (no-unused-vars, no-undef, etc.).
  js.configs.recommended,
  // TypeScript-aware type-checked rules; requires parserOptions.project.
  // recommended-type-checked: stricter than recommended; includes
  // @typescript-eslint/no-unsafe-* family which catches real runtime bugs.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // projectService: true lets typescript-eslint find the right tsconfig
        // per file, handling the src/tests split without manual paths.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // These patterns are not type-aware and must use the flat-config
    // ignores key (not .eslintignore which is deprecated in ESLint 9).
    ignores: ["dist/**", "node_modules/**", "scripts/**", "vite.config.ts"],
  },
);
