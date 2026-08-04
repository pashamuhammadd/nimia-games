import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "When orders placed with Nimia Studio can be refunded or cancelled, and how cryptocurrency refunds are processed.",
  alternates: {
    canonical: "/refund-policy",
  },
};

const LAST_UPDATED = "August 4, 2026";

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains when an order placed with Nimia Studio can be refunded or cancelled, and how refunds are handled given that all payments are made in cryptocurrency. It should be read together with our Terms of Service."
    >
      <LegalSection title="1. Overview">
        <p>
          Because Nimia Studio accepts payment in cryptocurrency only, and
          blockchain transactions cannot be reversed once confirmed, our
          refund policy is built around one key line: whether production
          has already started.
        </p>
      </LegalSection>

      <LegalSection title="2. Before Production Starts — Refundable">
        <p>
          If you cancel your order, or we are unable to reach agreement on
          scope, after payment has been verified but{" "}
          <strong className="text-white/80">before</strong> our team has
          begun production work, you are eligible for a full refund of the
          amount verified, minus any network fees described in Section 4.
        </p>
      </LegalSection>

      <LegalSection title="3. After Production Starts — Non-Refundable">
        <p>
          Once our team has begun production work on your order, the order
          is <strong className="text-white/80">non-refundable</strong>.
          This reflects both the irreversible nature of cryptocurrency
          payments and the production time and resources already committed
          to your project. If you wish to stop a project already in
          production, contact us — we will always try to find a reasonable
          resolution (such as delivering completed work-in-progress), but a
          cash refund will generally not be available past this point.
        </p>
      </LegalSection>

      <LegalSection title="4. How Refunds Are Processed">
        <p>
          Where a refund applies under Section 2, it is sent back on the{" "}
          same blockchain network you originally paid on, to a wallet
          address you provide at the time of the refund request. Because
          network (miner/gas) fees are charged by the blockchain itself and
          not by Nimia Studio, these fees may be deducted from the refunded
          amount. Nimia Studio cannot be responsible for funds sent to an
          incorrect wallet address you provide, and cannot reverse a refund
          once it is sent, for the same reason original payments cannot be
          reversed.
        </p>
      </LegalSection>

      <LegalSection title="5. Cancellations Initiated by You">
        <p>
          You may request cancellation at any time by contacting us. Whether
          a refund applies depends on whether production has started, per
          Sections 2 and 3 above.
        </p>
      </LegalSection>

      <LegalSection title="6. Cancellations or Declines Initiated by Nimia Studio">
        <p>
          If Nimia Studio declines an order request before any payment is
          made, no payment is due. If, in rare cases, Nimia Studio needs to
          cancel an order after payment has been verified but before
          production has started (for example, if we determine we cannot
          deliver the requested scope), you will receive a full refund under
          Section 4.
        </p>
      </LegalSection>

      <LegalSection title="7. Underpaid or Mismatched Payments">
        <p>
          If a submitted payment is underpaid, sent on the wrong network, or
          otherwise cannot be verified against your order, our team will
          flag it and contact you. Production will not begin until the
          discrepancy is resolved. If you choose not to complete the payment
          and instead request the partial amount back, it will be refunded
          under the same process described in Section 4, minus applicable
          network fees.
        </p>
      </LegalSection>

      <LegalSection title="8. Non-Refundable Circumstances">
        <p>
          In addition to Section 3, the following are not eligible for
          refund: delays caused by your own late feedback, unresponsiveness,
          or changes in requirements after production has started; and any
          network or exchange-rate fluctuations that occurred between
          quoting and payment, since the rate is fixed at the time of
          verified payment.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p>
          To request a cancellation or refund, or to ask about a specific
          order, contact{" "}
          <a
            href="mailto:contact@nimiagames.com"
            className="nimia-accent-text font-semibold"
          >
            contact@nimiagames.com
          </a>{" "}
          with your order details.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
