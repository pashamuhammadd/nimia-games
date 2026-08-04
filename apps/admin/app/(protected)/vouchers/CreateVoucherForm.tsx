"use client";

import * as React from "react";
import { Input, Label, Listbox, Button } from "@nimia/ui";
import { createVoucherAction } from "./actions";

export type ClientOption = {
  id: string;
  company_name: string | null;
  users: { full_name: string | null; email: string } | null;
};

function clientLabel(client: ClientOption) {
  return client.company_name || client.users?.full_name || client.users?.email || "Unnamed client";
}

// Not gen_random_uuid-grade, just a quick human-typeable suggestion — the
// admin can always edit it before submitting, and the DB's own UNIQUE
// constraint + normalize-to-uppercase trigger (0021) are what actually
// guarantee correctness, not this.
function suggestCode() {
  return "PROMO-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function CreateVoucherForm({ clients }: { clients: ClientOption[] }) {
  const [code, setCode] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("10");
  const [clientId, setClientId] = React.useState("");
  const [maxRedemptions, setMaxRedemptions] = React.useState("1");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const clientOptions = [
    { value: "", label: "Public / anyone with the code" },
    ...clients.map((client) => ({ value: client.id, label: clientLabel(client) })),
  ];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await createVoucherAction({
      code,
      discountPercent: Number(discountPercent),
      clientId: clientId || null,
      maxRedemptions: Number(maxRedemptions) || 1,
      expiresAt: expiresAt || null,
      note: note || null,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setCode("");
    setNote("");
    setExpiresAt("");
    setClientId("");
    setMaxRedemptions("1");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">New Voucher</h2>
        <button
          type="button"
          onClick={() => setCode(suggestCode())}
          className="text-xs font-medium text-[var(--nimia-pink)] hover:underline"
        >
          Suggest a code
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="voucher-code-input">Code</Label>
          <Input
            id="voucher-code-input"
            placeholder="e.g. WELCOME10"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label htmlFor="voucher-discount-input">Discount (%)</Label>
          <Input
            id="voucher-discount-input"
            type="number"
            min={1}
            max={100}
            value={discountPercent}
            onChange={(event) => setDiscountPercent(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="voucher-client-select">Assign to</Label>
          <Listbox id="voucher-client-select" value={clientId} onChange={setClientId} options={clientOptions} />
        </div>
        {!clientId ? (
          <div>
            <Label htmlFor="voucher-max-redemptions-input">Max redemptions</Label>
            <Input
              id="voucher-max-redemptions-input"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
            />
          </div>
        ) : (
          // A personal voucher is always single-use — enforced server-side
          // (vouchers_personal_single_use, 0021), shown here just so the
          // field doesn't look silently ignored.
          <p className="self-end pb-2.5 text-xs text-white/40">Personal vouchers are always single-use.</p>
        )}
        <div>
          <Label htmlFor="voucher-expires-input">Expires (optional)</Label>
          <Input
            id="voucher-expires-input"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="voucher-note-input">Note (optional)</Label>
          <Input
            id="voucher-note-input"
            placeholder="Internal note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">Voucher created.</p> : null}

      <Button type="submit" size="sm" disabled={isSubmitting} isLoading={isSubmitting} className="self-start">
        Create Voucher
      </Button>
    </form>
  );
}
