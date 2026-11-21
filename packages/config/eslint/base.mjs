import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";

/** Shared ignores + Prettier compatibility. Compose with a framework config. */
export const baseConfig = defineConfig([
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "dist/**", "coverage/**", "next-env.d.ts"]),
]);

export default baseConfig;
