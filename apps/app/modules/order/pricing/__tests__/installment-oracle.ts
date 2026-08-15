/**
 * Test-only pure-TS mirror of the two Postgres trigger functions that
 * actually own this business logic in production:
 *   - public.derive_order_normal_price()          (BEFORE UPDATE on orders)
 *   - public.materialize_order_installments()      (AFTER UPDATE on orders)
 * both defined in packages/db/migrations/0038_custom_order_installments.sql.
 *
 * This file is NOT imported by any application code — it exists purely so
 * the Vitest "simulation" suite (per the user's explicit request, 15
 * Agustus 2026: "buat simulasi ... admin manage semua orderan itu harus
 * sukses jangan ada yang salah, kesalahan kecil aja bisa fatal") can verify
 * the exact cent-accurate math and branching the live database trigger
 * performs, without a live Supabase connection or credentials.
 *
 * IMPORTANT — keep this in lockstep with the SQL by hand: there is no
 * codegen link between them. If 0038 (or a later migration) changes the
 * milestone percentages, labels, rounding rule, or validation messages,
 * this file must be updated to match, or these tests will pass while
 * silently testing the WRONG spec. Every branch below cites the exact SQL
 * clause it mirrors.
 */

export type PaymentMethod = "full_payment" | "installments";
export type PaymentPlan = "none" | "two_milestones" | "three_milestones" | "custom";
export type InstallmentStatus = "scheduled" | "pending_payment";

export type FullInstallmentStatus = InstallmentStatus | "paid";

export interface MaterializedInstallment {
  sequence: number;
  label: string;
  percentage: number;
  amountUsd: number;
  status: FullInstallmentStatus;
}

interface MaterializeInput {
  finalPriceUsd: number;
  paymentMethod: PaymentMethod;
  paymentPlan: PaymentPlan;
  customPercentages?: number[] | null;
  customLabels?: string[] | null;
}

/** Postgres `round(numeric, 2)` rounds half away from zero for positive
 * inputs — same behavior as JS Math.round for the positive dollar amounts
 * this domain always deals with (order prices are never negative). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Mirrors materialize_order_installments()'s full body (the AFTER UPDATE
 * trigger fires only once, the instant an order transitions into
 * 'awaiting_payment' with a non-null final_price_usd and payment_method —
 * this function assumes that gate has already passed and takes
 * finalPriceUsd/paymentMethod/paymentPlan as given, exactly like the SQL
 * function receives them via NEW.*).
 */
export function materializeInstallments(input: MaterializeInput): MaterializedInstallment[] {
  const { finalPriceUsd: total, paymentMethod, paymentPlan } = input;

  if (paymentMethod === "full_payment") {
    return [{ sequence: 1, label: "Full Payment", percentage: 100, amountUsd: total, status: "pending_payment" }];
  }

  // installments — 'none' falls back to Two Milestones (spec's stated
  // default), same as `v_plan := case when new.payment_plan = 'none' then
  // 'two_milestones' else new.payment_plan end;`
  const plan: Exclude<PaymentPlan, "none"> = paymentPlan === "none" ? "two_milestones" : paymentPlan;

  let pct: number[];
  let labels: string[];

  if (plan === "two_milestones") {
    pct = [50, 50];
    labels = ["Project Start", "Before Final Delivery"];
  } else if (plan === "three_milestones") {
    pct = [30, 30, 40];
    labels = ["Project Start", "Project Milestone", "Final Delivery"];
  } else {
    // custom
    const customPct = input.customPercentages ?? null;
    if (!customPct || customPct.length < 2) {
      throw new Error(
        "A custom payment plan needs at least 2 milestone percentages set by Admin before pricing is confirmed.",
      );
    }
    const sum = customPct.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error("Custom milestone percentages must add up to 100.");
    }
    pct = customPct;
    const customLabels = input.customLabels ?? null;
    labels =
      customLabels && customLabels.length === pct.length
        ? customLabels
        : pct.map((_, i) => `Milestone ${i + 1}`);
  }

  const n = pct.length;
  const rows: MaterializedInstallment[] = [];
  let running = 0;
  for (let i = 0; i < n; i++) {
    const sequence = i + 1;
    let amount: number;
    if (i < n - 1) {
      amount = round2((total * pct[i]) / 100);
      running += amount;
    } else {
      // Last installment absorbs any rounding remainder — spec section 23:
      // the sum must always equal final_price_usd exactly, never drift by a
      // cent.
      amount = round2(total - running);
    }
    rows.push({
      sequence,
      label: labels[i],
      percentage: pct[i],
      amountUsd: amount,
      status: sequence === 1 ? "pending_payment" : "scheduled",
    });
  }
  return rows;
}

/**
 * Mirrors derive_order_normal_price()'s body — only fires (in SQL) when
 * final_price_usd actually changed, but the derivation itself is this pure
 * formula. Product decision #2 (0038's own header comment): Partner
 * referral rewards on an installment order are computed on this NORMAL
 * (pre-fee) price, never the installment-inflated final_price_usd.
 */
export function deriveNormalPrice(finalPriceUsd: number, paymentMethod: PaymentMethod, feePercentage: number): number {
  if (paymentMethod === "installments") {
    return round2(finalPriceUsd / (1 + feePercentage / 100));
  }
  return finalPriceUsd;
}

/**
 * Mirrors handle_installment_paid() — fires when Admin verifies one
 * installment (flips its status to 'paid'). Two effects, both modeled here:
 *   1. Unlocks the next 'scheduled' row (by sequence order) to
 *      'pending_payment'.
 *   2. Reports whether the PARENT order should flip to 'paid' — which per
 *      product decision #1 happens on installment #1 specifically, not the
 *      last one (project starts the moment the client commits, not when
 *      they finish paying).
 * Returns a NEW array (does not mutate the input) plus the derived
 * order-level effect, so a test/simulation can chain calls the same way the
 * real trigger chains across sequential admin verifications.
 */
export function markInstallmentPaid(
  installments: MaterializedInstallment[],
  paidSequence: number,
): { installments: MaterializedInstallment[]; orderShouldBePaid: boolean } {
  const next = installments
    .filter((row) => row.status === "scheduled")
    .sort((a, b) => a.sequence - b.sequence)[0];

  const updated = installments.map((row) => {
    if (row.sequence === paidSequence) return { ...row, status: "paid" as const };
    if (next && row.sequence === next.sequence) return { ...row, status: "pending_payment" as const };
    return row;
  });

  return { installments: updated, orderShouldBePaid: paidSequence === 1 };
}
