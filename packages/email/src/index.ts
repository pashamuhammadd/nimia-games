export {
  EmailLayout,
  BRAND,
  FONT_STACK,
  STUDIO_LOCKUP_URL,
  SITE_URL,
  CONTACT_EMAIL,
  ctaButtonStyle,
} from "./components/EmailLayout";

export { OrderReceivedEmail, type OrderReceivedEmailProps } from "./templates/OrderReceivedEmail";

export {
  ContactMessageEmail,
  type ContactMessageEmailProps,
} from "./templates/ContactMessageEmail";

// ConfirmSignupEmail HANYA untuk preview lokal / referensi desain — email
// aslinya dikirim oleh Supabase Auth sendiri dari HTML statis di
// supabase-templates/confirm-signup.html (lihat README), bukan dari
// komponen ini.
export {
  ConfirmSignupEmail,
  type ConfirmSignupEmailProps,
} from "./templates/ConfirmSignupEmail";
