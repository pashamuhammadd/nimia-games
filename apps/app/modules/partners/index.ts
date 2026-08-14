// Nimia Partner Program — module root barrel.
//
// Per project architecture rules: everything outside this folder (the
// dashboard page, the register form, etc.) imports ONLY from
// "@/modules/partners" — never by reaching into
// "@/modules/partners/services/..." or "@/modules/partners/repository/..."
// directly. `repository/` is deliberately NOT re-exported here: it's an
// implementation detail of services/, not something a page or component
// should ever call directly.

export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./schemas";
export * from "./services";
export * from "./hooks";
export * from "./components";
