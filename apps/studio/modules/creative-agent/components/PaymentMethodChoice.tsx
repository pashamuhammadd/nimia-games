"use client";

import { Check, CreditCard, Layers3 } from "lucide-react";
import { cn } from "@nimia/ui";
import type { CreativeAgentPaymentMethod } from "../types";

export interface PaymentMethodChoiceProps {
  paymentMethod: CreativeAgentPaymentMethod | null;
  onSelect: (method: CreativeAgentPaymentMethod) => void;
}

// Payment Method step for Nimia Creative Agent (16 Agustus 2026, Fase 6 of
// the Order/Payment/Invoice/Creative Agent refactor). Every other order
// path on this site (Project Builder, Package, Custom Order — see
// apps/app/modules/order/components/payment-method-step.tsx) already
// requires this choice before Submit; the Creative Agent's own
// CreativeBriefCard let a client submit with none.
//
// Deliberately NOT a port of that component: PaymentMethodStep shows a
// dollar-amount preview computed from `estimate.subtotal`, which requires
// a real catalog-resolved price. A Creative Agent order never has one —
// `proposed_price_usd` stays null on purpose (see
// submit-creative-agent-order-action.ts's own header comment: the team
// prices it after reviewing the brief). Showing a fake or zeroed preview
// here would be worse than showing none, so this is just the choice
// itself, in Creative Agent's own gold-accented card style
// (CreativeBriefCard/UnderstandingPreviewCard), with copy that sets the
// right expectation instead of a number.
export function PaymentMethodChoice({ paymentMethod, onSelect }: PaymentMethodChoiceProps) {
  return (
    <div className="mt-5 border-t border-[var(--nimia-border)] pt-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">How would you like to pay?</p>
      <p className="mt-1 text-xs text-[var(--nimia-muted)]">
        Our team confirms the exact price and milestone schedule once they review your brief — this just tells
        them which way you&rsquo;d prefer to pay.
      </p>

      <div role="radiogroup" aria-label="Payment method" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            {
              value: "full_payment" as const,
              icon: CreditCard,
              title: "Pay in Full",
              description: "One payment, no extra fee, once the price is confirmed.",
            },
            {
              value: "installments" as const,
              icon: Layers3,
              title: "Pay in Installments",
              description: "Split into milestones, with a small flexibility fee.",
            },
          ] satisfies { value: CreativeAgentPaymentMethod; icon: typeof CreditCard; title: string; description: string }[]
        ).map((option) => {
          const selected = paymentMethod === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150",
                selected
                  ? "border-[var(--nimia-gold)] bg-[var(--nimia-gold)]/10"
                  : "border-[var(--nimia-border)] bg-black/10 hover:border-[var(--nimia-gold-soft)]",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-[var(--nimia-gold)] text-[#1a0f14]" : "bg-white/[0.06] text-[var(--nimia-gold)]",
                )}
              >
                {selected ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--foreground)]">{option.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--nimia-muted)]">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
