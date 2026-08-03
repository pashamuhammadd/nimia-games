"use client";
import { Modal } from "@nimia/ui";
import { LoginForm } from "../login/LoginForm";

// `redirectedFrom` (3 Agustus 2026, per user request — modal login
// sitewide) is forwarded straight into LoginForm's own `redirectedFrom`
// prop, which signInAction (see app/actions.ts) reads as a hidden field and
// redirects to on success instead of the default /dashboard. This is what
// lets StartProjectButton reuse this same modal from every "Start Your
// Project" CTA across the site and always land a freshly-logged-in visitor
// on /order, not just the navbar.
export function LoginModal({
  open,
  onClose,
  redirectedFrom,
}: {
  open: boolean;
  onClose: () => void;
  redirectedFrom?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Log in" className="nimia-dark">
      <LoginForm variant="modal" onSuccess={onClose} redirectedFrom={redirectedFrom} />
    </Modal>
  );
}
