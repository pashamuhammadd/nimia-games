"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MotionFrameLogo } from "../brand/MotionFrameLogo";
import { StartProjectButton } from "../StartProjectButton";
import { CLIENT_DASHBOARD_URL, CLIENT_LOGIN_URL } from "./links";

const SECTION_LINKS = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How it works" },
];

export function HomeNavbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const account = isAuthenticated
    ? { href: CLIENT_DASHBOARD_URL, label: "Dashboard" }
    : { href: CLIENT_LOGIN_URL, label: "Client login" };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--orchid-border)] bg-[var(--orchid-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-h-[44px] shrink-0 items-center rounded-md" onClick={() => setOpen(false)}>
          <MotionFrameLogo height={38} className="h-[34px] w-auto sm:h-[38px]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center text-[0.95rem] font-medium text-[var(--orchid-text)] transition-colors hover:text-[var(--orchid-pink)]"
            >
              {link.label}
            </a>
          ))}
          <a
            href={account.href}
            className="inline-flex min-h-[44px] items-center text-[0.95rem] font-medium text-[var(--orchid-text)] transition-colors hover:text-[var(--orchid-pink)]"
          >
            {account.label}
          </a>
          <span aria-hidden="true" className="h-6 w-px bg-[var(--orchid-border)]" />
          <StartProjectButton isAuthenticated={isAuthenticated} className="orchid-btn orchid-btn-primary min-h-[44px] px-5 text-sm">
            Start a project
          </StartProjectButton>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--orchid-text)] hover:bg-white/10 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-[var(--orchid-border)] px-4 pb-6 pt-3 lg:hidden">
        <nav aria-label="Mobile" className="flex flex-col">
          {[...SECTION_LINKS, account].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[48px] items-center rounded-xl px-3 text-base font-semibold text-[var(--orchid-text)] hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <StartProjectButton
          isAuthenticated={isAuthenticated}
          onClick={() => setOpen(false)}
          className="orchid-btn orchid-btn-primary mt-4 w-full"
        >
          Start a project
        </StartProjectButton>
      </div>
    </header>
  );
}
