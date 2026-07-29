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
    <Modal open={open} onClose={onClose} ariaLabel="Log in">
      <LoginForm variant="modal" onSuccess={onClose} />
    </Modal>
  );
}
