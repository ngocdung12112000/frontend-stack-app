/** Opt-in server-side API mocking for local dev: API_MOCKING=enabled pnpm dev */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.API_MOCKING === "enabled") {
    const { server } = await import("./mocks/server");
    server.listen({ onUnhandledFrame: "bypass" });
    console.log("[msw] API mocking enabled");
  }
}
