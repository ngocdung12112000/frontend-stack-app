import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";
import { baseConfig } from "./base.mjs";

/** For React component libraries (packages/ui). Reuses the Next rule set (react, hooks, a11y, TS). */
export const reactLibraryConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...baseConfig,
  // Libraries have no pages/ directory.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);

export default reactLibraryConfig;
