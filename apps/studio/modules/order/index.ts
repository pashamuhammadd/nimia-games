// Nimia Order Configurator — module root barrel.
//
// Per project architecture rules (see modules/partners/index.ts for the
// precedent): everything outside this folder imports ONLY from
// "@/modules/order" — never by reaching into "@/modules/order/data/..." or
// "@/modules/order/state/..." directly.

export * from "./types";
export * from "./data";
export * from "./pricing";
export * from "./state";
export * from "./components";
