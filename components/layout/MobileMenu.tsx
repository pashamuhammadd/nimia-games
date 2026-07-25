"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FlowLink from "@/components/flow/FlowLink";
import { FLOW, flowIndex } from "@/lib/flow";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeIndex = flowIndex(pathname);

  // Close the menu automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition hover:border-[var(--nimia-pink)]/50"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[61px] z-40 border-t border-white/10 bg-[#0a0407]/98 px-5 pb-8 pt-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {FLOW.map((item, index) => {
              const active = index === activeIndex;

              return (
                <FlowLink
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-3 text-base font-semibold transition ${
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-white/75 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {item.label}
                </FlowLink>
              );
            })}

            <a
              href="https://studio.nimiagames.com"
              target="_blank"
              rel="noreferrer"
              className="nimia-button-primary mt-4 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black"
            >
              Go to Studio
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
