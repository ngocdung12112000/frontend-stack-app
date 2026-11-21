# CLAUDE.md (stackshop-frontend)

pnpm 11 + Turborepo workspace. Default-scaffold approach: stock create-next-app (Next.js 16.4, `cacheComponents` + `partialPrefetching` enabled, Tailwind v4 via `@tailwindcss/turbopack`), plus shared packages. `apps/admin`, the api-client, MSW, Playwright and the remaining workflows come later.

**Read `apps/web/AGENTS.md` first:** this Next.js differs from older versions. Consult `apps/web/node_modules/next/dist/docs/` before writing Next code.

## Layout

| Path              | Package             | Contents                                                                                                                                                                 |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`        | `web`               | Storefront. `src/app` (App Router, `(shop)` route group), `src/components/{layout,theme}`, `src/lib`                                                                     |
| `packages/ui`     | `@stackshop/ui`     | shadcn/ui components (Button, Sheet, DropdownMenu, Separator), `cn()`, theme tokens in `src/styles/globals.css`. Exported from `src/index.ts` (TS source, no build step) |
| `packages/config` | `@stackshop/config` | `tsconfig.{base,nextjs,react-library}.json`, ESLint flat configs (`eslint/{base,next,react-library}`), Prettier config                                                   |

## Commands (run from the repo root)

```bash
pnpm install
pnpm dev          # web on :3000
pnpm build        # turbo run build
pnpm lint         # turbo run lint (eslint . in every package)
pnpm typecheck    # turbo run typecheck (web runs `next typegen` first)
pnpm test         # turbo run test (vitest + MSW in apps/web)
pnpm format       # prettier --write .   (format:check to verify)
```

Per package: `pnpm -F web dev`, `pnpm -F @stackshop/ui typecheck`. If `typecheck` shows stale `.next/dev/types` errors, delete `apps/web/.next`.

On this Windows machine PowerShell blocks `.ps1` shims; run pnpm from bash or cmd.

## Conventions

- Apps extend `@stackshop/config` (tsconfig and eslint). Reusable UI lives in `packages/ui`; add shadcn components there (`packages/ui/components.json`) and export them from `src/index.ts`.
- Tailwind does not scan workspace symlinks, so `apps/web/src/app/globals.css` has `@source "../../../../packages/ui/src"`. A new app must add the same line and `@import "@stackshop/ui/styles.css"`.
- Theme: `next-themes` (class strategy, system default) in the root layout; `<html suppressHydrationWarning>`. Dark variant is `.dark`.
- Do not commit the local `pnpm gen:api --from ...` override, and never expose secrets as `NEXT_PUBLIC_*`.

## API client, GitHub Packages and MSW

**GitHub Packages auth.** `.npmrc` only maps the `@ngocdung12112000` scope to `https://npm.pkg.github.com`. pnpm ignores `${ENV}` tokens in a project `.npmrc`, so put the token in your user-level `~/.npmrc` (or `pnpm config set`): `//npm.pkg.github.com/:_authToken=<PAT with read:packages>`. In CI, `actions/setup-node` with `registry-url` + `NODE_AUTH_TOKEN` writes that file. Never commit a token.

**API client.** `@ngocdung12112000/api-client` is pinned to the published `0.1.1` from GitHub Packages (needs the PAT above). Create the client with `createStackShopClient({ baseUrl })` and call flat paths, e.g. `client.GET("/api/v1/products", { params: { query: { limit } } })`. Product lists are page-based (`items`, `page`, `pageSize`, `totalCount`). Bump with the `bump-api-client` skill.

**Server API access.** `apps/web/src/lib/api.ts` (`server-only`) builds the client from `API_BASE_URL` (default `http://localhost:5000`; see `apps/web/.env.example`). Never `NEXT_PUBLIC_*`.

**MSW.** Handlers in `apps/web/src/mocks/handlers.ts`, Node server in `mocks/server.ts` (used by Vitest via `vitest.setup.ts`). Dev opt-in: `API_MOCKING=enabled pnpm dev` (registered in `src/instrumentation.ts`, server-side only; no browser worker because the browser never calls the gateway).

## CI (`.github/workflows/ci.yml`)

Runs on `pull_request` and push to `main` (superseded PR runs are cancelled). One job: checkout, `pnpm/action-setup@v6` (version from the `packageManager` field), `setup-node@v5` (Node 24, pnpm cache, `registry-url` + `scope` so `~/.npmrc`-equivalent is written), cache of `.turbo` + `apps/*/.next/cache`, `pnpm install --frozen-lockfile`, then `pnpm lint`, `typecheck`, `test`, `build`. No live gateway or `API_MOCKING` is needed (tests use MSW, build is static/PPR). Not yet exercised on GitHub; `actionlint` passes.

**Package access (manual setup).** `@ngocdung12112000/api-client` is published from the `stackshop-backend` repo, so this repo's `GITHUB_TOKEN` can read it only if the package grants this repo access. Either:
1. In GitHub: Packages > `api-client` > Package settings > "Manage Actions access" > add `stackshop-frontend` with Read; or
2. Create a PAT (classic, `read:packages`) and store it as the repo secret `PACKAGES_READ_TOKEN`. The workflow uses `secrets.PACKAGES_READ_TOKEN || secrets.GITHUB_TOKEN` as `NODE_AUTH_TOKEN` for install.

`setup-node` writes a user-level npmrc (`NPM_CONFIG_USERCONFIG`) containing `_authToken=${NODE_AUTH_TOKEN}`; pnpm 11 reads that file and substitutes the env var (verified locally), unlike the project `.npmrc`.
