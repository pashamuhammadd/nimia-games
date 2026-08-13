// Nimia Creative Agent — module root barrel.
//
// Per this project's existing convention (see modules/partners/index.ts,
// modules/order/index.ts): external consumers (app/page.tsx) import from
// "@/modules/creative-agent", not by reaching into subpaths directly.
//
// `service/`, `repository/`, and `provider/` are deliberately NOT
// re-exported here — same reasoning as modules/partners' repository being
// hidden from its barrel: they're implementation details of this module's
// one server entry point (app/api/creative-agent/route.ts), which imports
// creativeAgentService directly, not through this barrel. Unlike
// modules/order's server ACTIONS ("use server" functions, safe to import
// straight into a Client Component because Next.js compiles them into an
// RPC stub), creativeAgentService is a plain server-only object with no
// "use server" directive — barrel-exporting it here would risk it getting
// pulled into the client bundle via CreativeAgentSection's import below.
export * from "./types";
export { CREATIVE_AGENT_SESSION_COOKIE, CREATIVE_AGENT_SESSION_COOKIE_MAX_AGE_SECONDS } from "./constants";
export * from "./components";
