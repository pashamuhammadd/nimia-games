"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import FlowLink from "@/components/flow/FlowLink";
import MobileMenu from "@/components/layout/MobileMenu";
import { FLOW, flowIndex } from "@/lib/flow";

export default function Navbar() {
  const pathname = usePathname();
  const activeIndex = flowIndex(pathname);

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#0a0407]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-6">
        {/* Logo */}
        <FlowLink href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-8 w-8 object-contain transition duration-300 hover:scale-105 hover:rotate-3 md:h-9 md:w-9"
          />

          {/* Wordmark: baked from the Quadrillion typeface as static vector
              paths (not a live @font-face), since that font's license only
              permits static/logo use, not web embedding. */}
          <Image
            src="/nimia-games-wordmark.svg"
            alt="Nimia Games"
            width={171}
            height={16}
            unoptimized
            priority
            className="h-4 w-auto md:h-[18px]"
          />
        </FlowLink>

        {/* Menu (desktop) */}
        <div className="hidden items-center gap-7 md:flex">
          {FLOW.map((item, index) => {
            const active = index === activeIndex;

            return (
              <FlowLink
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative text-sm font-medium transition ${
                  active ? "text-white" : "text-white/65 hover:text-white"
                }`}
              >
                {item.label}

                <span
                  className={`absolute -bottom-2 left-0 h-[2px] rounded-full nimia-gradient-bg transition-all duration-300 ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </FlowLink>
            );
          })}
        </div>

        {/* CTA (desktop) */}
        <a
          href="https://nimiastudio.com"
          target="_blank"
          rel="noreferrer"
          className="nimia-button-primary hidden rounded-full px-4 py-2 text-xs font-semibold tracking-wide md:inline-flex"
        >
          Go to Studio
        </a>

        {/* Mobile hamburger + slide-down menu */}
        <MobileMenu />
      </nav>
    </header>
  );
}
