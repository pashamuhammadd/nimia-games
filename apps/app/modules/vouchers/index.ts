// Nimia Vouchers module — root barrel.
//
// Per project architecture rules: everything outside this folder (the
// dashboard page, the payment flow, etc.) imports ONLY from
// "@/modules/vouchers" — never by reaching into
// "@/modules/vouchers/services/..." or "@/modules/vouchers/repository/..."
// directly. `repository/` is deliberately NOT re-exported here: it's an
// implementation detail of services/, not something a page or component
// should ever call directly.

export * from "./types";
export * from "./services";
export * from "./components";
