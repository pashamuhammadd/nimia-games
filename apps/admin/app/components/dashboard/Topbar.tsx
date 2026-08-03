"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, ExternalLink } from "lucide-react";
import { getActiveNavItem } from "../AdminNav";

// Cross-link to the client-facing app — genuinely useful for staff jumping
// between "what did the client see" and "what do we manage" — unlike
// studio's Topbar, there's no Discord support link here (that's a
// client-facing concern) and no "Account Settings" link (no profile page
// exists in this v1 scope, so it isn't wired to a dead route).
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://studio.nimiagames.com";

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onOutside]);
  return ref;
}

export function Topbar({
  onMenuClick,
  userName,
  userEmail,
  onSignOut,
}: {
  onMenuClick: () => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const pageTitle = getActiveNavItem(pathname)?.label ?? "Overview";
  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase();

  const [bellOpen, setBellOpen] = React.useState(false);
  const [avatarOpen, setAvatarOpen] = React.useState(false);
  const bellRef = useClickOutside<HTMLDivElement>(() => setBellOpen(false));
  const avatarRef = useClickOutside<HTMLDivElement>(() => setAvatarOpen(false));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0a0508]/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#0a0508]/60 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/[0.06] hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-white sm:text-lg">{pageTitle}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white sm:flex"
        >
          Nimia Studio
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>

        <div ref={bellRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setBellOpen((v) => !v);
              setAvatarOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={bellOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          {bellOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-11 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#120a0f]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <div className="px-3.5 pb-2 pt-3 text-sm font-semibold text-white">Notifications</div>
              <div className="px-3.5 pb-4 pt-1 text-sm text-white/45">
                You&apos;re all caught up, nothing new right now.
              </div>
            </div>
          ) : null}
        </div>

        <div ref={avatarRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setAvatarOpen((v) => !v);
              setBellOpen(false);
            }}
            aria-expanded={avatarOpen}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--nimia-crimson)] to-[var(--nimia-pink)] text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-white/90 sm:inline">
              {userName || userEmail}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-white/40 sm:inline" />
          </button>

          {avatarOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#120a0f]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <div className="px-3 pb-2 pt-1.5">
                <p className="truncate text-sm font-medium text-white">{userName || "Admin"}</p>
                <p className="truncate text-xs text-white/40">{userEmail}</p>
              </div>
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  setAvatarOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
