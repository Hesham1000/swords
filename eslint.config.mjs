import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Plain CommonJS Node scripts (package.json has no "type": "module",
    // so they cannot use ESM imports without breaking `node scripts/x.js`)
    "scripts/**/*.js",
    "analyze_products.js",
  ]),
]);

export default eslintConfig;
