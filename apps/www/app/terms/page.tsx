import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern ordering game development, animation, and digital asset services from Nimia Studio.",
  alternates: {
    canonical: "/terms",
  },
};

const LAST_UPDATED = "August 4, 2026";

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These Terms of Service (“Terms”) govern your access to nimiagames.com and studio.nimiagames.com and any order you place for game development, animation, or digital asset production services. By creating an account or submitting an order, you agree to these Terms."
    >
      <LegalSection title="1. About Nimia Studio">
        <p>
          Nimia Studio is the production arm of Nimia Games, an independent
          creative studio based in Indonesia. Nimia Studio is currently
          operated by its founder and is in the process of being registered
          as a limited liability company under the name{" "}
          <strong className="text-white/80">
            PT Nimia Digital Production
          </strong>{" "}
          (or a successor legal name). References to &ldquo;Nimia
          Studio,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo; in these Terms mean that operating entity,
          whichever form it currently takes.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, and capable of entering into a binding contract, to
          create an account or place an order with Nimia Studio.
        </p>
      </LegalSection>

      <LegalSection title="3. Services">
        <p>
          Nimia Studio offers custom production services including, but not
          limited to, game development, animation, and digital asset
          creation. The specific scope, deliverables, and timeline for each
          order are defined during the order and negotiation process
          described below, not by this general description.
        </p>
      </LegalSection>

      <LegalSection title="4. Account Registration">
        <p>
          To place an order you must create an account and provide an
          accurate, active email address. You are responsible for keeping
          your login credentials confidential and for all activity that
          occurs under your account.
        </p>
      </LegalSection>

      <LegalSection title="5. Order &amp; Negotiation Process">
        <p>
          When you submit an order, you are sending Nimia Studio a request
          with your project details and proposed budget. This is not a
          binding contract until it reaches one of the following states:
        </p>
        <p>
          Our team reviews the request and may accept it as submitted, or
          send a counter-offer with an adjusted price and/or scope. You may
          accept an offer or counter-offer, at which point the order becomes
          confirmed and payable at the agreed price. Nimia Studio may also
          decline a request it cannot fulfil; in that case no payment is
          due and no contract is formed.
        </p>
      </LegalSection>

      <LegalSection title="6. Pricing &amp; Payment">
        <p>
          Prices are quoted in US Dollars (USD) for clarity, but Nimia
          Studio currently accepts payment{" "}
          <strong className="text-white/80">
            in cryptocurrency only
          </strong>
          . At the time of payment, the USD price is converted to your
          chosen network and currency using a live public exchange rate. You
          are responsible for sending the correct amount, on the correct
          network, to the payment address provided, and for any network
          (miner/gas) fees charged by the blockchain itself — these are
          separate from, and not controlled by, Nimia Studio.
        </p>
        <p>
          Cryptocurrency transactions are irreversible once confirmed on
          their network. Please double-check the network, currency, address,
          and amount before sending payment.
        </p>
      </LegalSection>

      <LegalSection title="7. Payment Verification">
        <p>
          After you submit a payment, our team manually verifies it against
          the relevant public blockchain before production begins.
          Verification may take some time depending on network confirmation
          times and our review process. If a payment is underpaid,
          sent on the wrong network, or otherwise cannot be matched to your
          order, we will flag it and contact you to resolve the discrepancy
          before production starts.
        </p>
      </LegalSection>

      <LegalSection title="8. Production Process &amp; Timelines">
        <p>
          Production begins once payment is verified. Estimated timelines
          are communicated during negotiation and are estimates, not
          guarantees — creative and technical production can be affected by
          scope clarifications, feedback rounds, or factors outside our
          control. We will communicate proactively if a timeline is likely
          to change.
        </p>
      </LegalSection>

      <LegalSection title="9. Client-Provided Content">
        <p>
          Any files, briefs, references, or other materials you upload or
          otherwise provide (&ldquo;Client Content&rdquo;) must be content
          you own or otherwise have the legal right to share with us for
          the purpose of your order. You are solely responsible for Client
          Content, and you agree not to upload content that is illegal,
          infringes a third party&rsquo;s rights, or that you do not have
          permission to use.
        </p>
      </LegalSection>

      <LegalSection title="10. Intellectual Property">
        <p>
          Unless otherwise agreed in writing for a specific order, ownership
          of the final agreed deliverables transfers to you upon full
          payment being verified and the deliverables being provided.
          Before full payment, and for any preliminary drafts, concepts, or
          work-in-progress materials, all rights remain with Nimia Studio.
          Nimia Studio retains the right to showcase completed work in its
          portfolio and marketing materials unless you request otherwise in
          writing and we agree.
        </p>
      </LegalSection>

      <LegalSection title="11. Revisions &amp; Scope Changes">
        <p>
          The number of revision rounds included, and what counts as a
          change to scope versus a covered revision, is set during
          negotiation for each order. Requests that go materially beyond the
          agreed scope may require an additional quote and, where
          applicable, additional payment before work continues.
        </p>
      </LegalSection>

      <LegalSection title="12. Refunds &amp; Cancellations">
        <p>
          Refunds and cancellations are governed by our separate{" "}
          <a href="/refund-policy" className="nimia-accent-text font-semibold">
            Refund &amp; Cancellation Policy
          </a>
          , which forms part of these Terms. In short: cancellations before
          production begins may be refundable; once production has started,
          orders are generally non-refundable, reflecting the fact that
          cryptocurrency payments cannot be reversed and production time has
          already been committed.
        </p>
      </LegalSection>

      <LegalSection title="13. Client Responsibilities">
        <p>
          You agree to provide timely, accurate information and feedback
          needed to complete your order, to respond to reasonable requests
          from our team, and to use the Sites and Services only for lawful
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="14. Prohibited Uses">
        <p>
          You may not use the Sites or Services to request content that is
          illegal, infringing, defamatory, or otherwise harmful; to attempt
          to disrupt, reverse-engineer, or gain unauthorised access to our
          systems; or to misrepresent your identity or authority to place an
          order.
        </p>
      </LegalSection>

      <LegalSection title="15. Disclaimers &amp; Limitation of Liability">
        <p>
          The Sites and Services are provided on an &ldquo;as is&rdquo; and
          &ldquo;as available&rdquo; basis. To the maximum extent permitted
          by applicable law, Nimia Studio disclaims all warranties, express
          or implied, and will not be liable for indirect, incidental, or
          consequential damages arising from your use of the Sites or
          Services, including losses relating to cryptocurrency price
          fluctuations, network fees, or delays caused by blockchain
          confirmation times. Nothing in these Terms excludes any liability
          that cannot be excluded under applicable law.
        </p>
      </LegalSection>

      <LegalSection title="16. Indemnification">
        <p>
          You agree to indemnify and hold Nimia Studio harmless from any
          claims, damages, or expenses arising from your breach of these
          Terms or your misuse of the Sites or Services, including claims
          relating to Client Content you provide.
        </p>
      </LegalSection>

      <LegalSection title="17. Governing Law &amp; Dispute Resolution">
        <p>
          These Terms are governed by the laws of the Republic of Indonesia,
          without regard to conflict-of-law principles. Any dispute arising
          from these Terms or an order shall first be addressed through
          good-faith direct negotiation between you and Nimia Studio, and,
          if unresolved, shall be subject to the exclusive jurisdiction of
          the competent courts of Indonesia.
        </p>
      </LegalSection>

      <LegalSection title="18. Changes to These Terms">
        <p>
          We may update these Terms as our Services evolve. Material changes
          will be reflected by updating the &ldquo;Last updated&rdquo; date
          above. Continued use of the Sites or placing a new order after
          changes take effect constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="19. Contact Us">
        <p>
          Questions about these Terms can be sent to{" "}
          <a
            href="mailto:contact@nimiagames.com"
            className="nimia-accent-text font-semibold"
          >
            contact@nimiagames.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
