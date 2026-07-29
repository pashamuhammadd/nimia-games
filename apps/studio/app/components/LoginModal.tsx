"use client";

import { Modal } from "@nimia/ui";
import { LoginForm } from "../login/LoginForm";

// The quick-login modal opened from the public navbar's "Log in" button
// (Tahap 5, sub-stage 1 — confirmed with the user: this exists ALONGSIDE
// the full /login page, not instead of it. The modal is a shortcut so a
// visitor doesn't lose their place on / or /services just to sign in;
// /login stays as a normal, bookmarkable, shareable page for anyone who
// prefers that or navigates there directly).
export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    // className="nimia-dark" here is required, not decorative: Modal
    // renders through a React portal straight onto document.body (see
    // packages/ui/src/components/Modal.tsx), which sits OUTSIDE the
    // .nimia-dark wrapper each public page renders around itself. CSS
    // custom properties only cascade down the real DOM tree, so without
    // this the modal would silently fall back to the light theme
    // defaults from :root even on a dark page. Safe to hardcode dark
    // here since every current caller of LoginModal is a public page.
    <Modal open={open} onClose={onClose} ariaLabel="Log in" className="nimia-dark">
      <LoginForm variant="modal" onSuccess={onClose} />
    </Modal>
  );
}
