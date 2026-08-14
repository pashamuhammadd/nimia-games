// Facade for the Partner module's "outside world" surface.
//
// Today this is a plain re-export of the service layer, called directly
// from Server Components (there's no persisted data yet, so there's
// nothing for a real API route to front). Once a `partners` table and
// Route Handlers exist (Tahap 5+), THIS file becomes the client-safe fetch
// wrappers — e.g. `applyReferralCode(code)` POSTing to
// `/api/partners/apply-referral` — that hooks/use-partner.ts and any client
// component call instead of importing services/ directly. Consumers that
// import from here (rather than reaching into services/ directly) won't
// need to change when that swap happens.
export { getPartnerOverview, type PartnerOverview } from "../services/partner.service";
