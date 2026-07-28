"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useFlowNavigate } from "@/lib/useFlowNavigate";

type FlowLinkProps = ComponentProps<typeof Link>;

/**
 * Drop-in replacement for next/link used across the site's main navigation
 * (Navbar, MobileMenu, FlowNav) so every way of moving between flow steps
 * animates through the same View Transitions helper. Still renders a real
 * <a href> so it stays crawlable and works with middle-click/ctrl-click.
 */
export default function FlowLink({ href, onClick, ...rest }: FlowLinkProps) {
  const navigate = useFlowNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) return;
    // Let modified clicks (open in new tab, etc.) behave normally.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const targetHref =
      typeof href === "string" ? href : (href.pathname ?? "/");

    event.preventDefault();
    navigate(targetHref);
  }

  return <Link href={href} onClick={handleClick} {...rest} />;
}
