import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      // Transitional: large legacy surface still uses broad JSON/data shapes.
      "@typescript-eslint/no-explicit-any": "warn",
      // Transitional: keep UI copy readable while we gradually escape entities.
      "react/no-unescaped-entities": "off",
      // Transitional: avoid blocking build while refactoring effects.
      "react-hooks/set-state-in-effect": "warn",
      // Transitional: keep lint signal but avoid blocking for legacy reassign cleanup.
      "prefer-const": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cypress/**",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
