import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      // Vendored tooling (the Impeccable skill's bundled scripts), not app code.
      ".claude/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Shipped code must not log; route errors go through a deliberate
      // console.error with no user content in it.
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
];

export default config;
