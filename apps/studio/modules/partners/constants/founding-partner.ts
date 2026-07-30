// Founding Partner quota — only the first 100 accounts that ever join the
// partner program get Founding Partner status (brief: "Hanya berlaku untuk
// 100 akun pertama yang mendaftar sebagai partner"). A single fixed
// constant now; once a real `partners` table exists this becomes a
// `count(*) where is_founding_partner` query instead of mock data, but the
// quota number itself stays this constant either way.
export const FOUNDING_PARTNER_QUOTA = 100;
