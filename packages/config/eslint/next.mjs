import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { baseConfig } from "./base.mjs";

/** For Next.js apps (apps/web, apps/admin). */
export const nextConfig = defineConfig([...nextVitals, ...nextTs, ...baseConfig]);

export default nextConfig;
