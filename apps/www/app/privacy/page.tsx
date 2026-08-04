import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Nimia Studio collects, uses, and protects your information when you use nimiagames.com and our production services.",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "August 4, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This Privacy Policy explains what information Nimia Studio collects when you visit our website or order production services, how we use it, and the choices and rights you have over it."
    >
      <LegalSection title="1. Who We Are">
        <p>
          Nimia Games / Nimia Studio (&ldquo;Nimia Studio,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an
          independent creative studio operating from Indonesia, building
          original games, animation, and digital assets. Nimia Studio is
          currently operated by its founder and is in the process of being
          registered as a limited liability company under the name{" "}
          <strong className="text-white/80">
            PT Nimia Digital Production
          </strong>{" "}
          (or a successor legal name). Once registration is complete, that
          entity will become the data controller described in this policy
          without any change to how your information is handled.
        </p>
        <p>
          This policy applies to nimiagames.com and studio.nimiagames.com
          (together, the &ldquo;Sites&rdquo;), and to the production
          services ordered through them (the &ldquo;Services&rdquo;).
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>We collect information in the following ways:</p>
        <p>
          <strong className="text-white/80">Account information.</strong>{" "}
          When you create an account to order a Service, we collect your
          email address and any name you provide, via our authentication
          provider (Supabase Auth).
        </p>
        <p>
          <strong className="text-white/80">Order information.</strong> When
          you submit an order, we collect the details you provide about the
          project (service type, brief, requirements, budget, timeline,
          reference files) and the messages exchanged during negotiation
          with our team.
        </p>
        <p>
          <strong className="text-white/80">
            Files you upload.
          </strong>{" "}
          Reference files, briefs, and other attachments you upload as part
          of an order are stored with our media provider (Cloudinary) and
          linked to your order.
        </p>
        <p>
          <strong className="text-white/80">Payment information.</strong>{" "}
          Nimia Studio accepts payment in cryptocurrency only. We collect the
          network, currency, transaction hash, and amount you report when
          submitting a payment, so our team can verify it on the relevant
          public blockchain. We do not collect, and never ask for, your
          private keys or wallet seed phrase.
        </p>
        <p>
          <strong className="text-white/80">
            Usage &amp; device information.
          </strong>{" "}
          Like most websites, our hosting provider (Vercel) automatically
          logs standard technical information such as IP address, browser
          type, and pages visited, for security and reliability purposes.
        </p>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <p>We use the information above to:</p>
        <p>
          Create and manage your account; process, negotiate, and fulfil
          your orders; verify cryptocurrency payments and flag
          discrepancies; send transactional emails about your order (order
          confirmation, negotiation updates, payment status); respond to
          support or contact requests; maintain the security and proper
          functioning of the Sites; and comply with applicable law.
        </p>
        <p>
          We do not use your information for third-party advertising, and we
          do not sell your personal data.
        </p>
      </LegalSection>

      <LegalSection title="4. How We Share Your Information">
        <p>
          We only share information with service providers that help us run
          Nimia Studio, and only to the extent needed for them to perform
          their function:
        </p>
        <p>
          <strong className="text-white/80">Supabase</strong> — database
          hosting, authentication, and file-access permissions (Row Level
          Security).
        </p>
        <p>
          <strong className="text-white/80">Cloudinary</strong> — storage
          for files you upload as part of an order.
        </p>
        <p>
          <strong className="text-white/80">Resend</strong> — delivery of
          transactional emails related to your order.
        </p>
        <p>
          <strong className="text-white/80">Vercel</strong> — hosting and
          infrastructure for the Sites.
        </p>
        <p>
          <strong className="text-white/80">CoinGecko</strong> — public,
          non-personal exchange-rate data used to calculate cryptocurrency
          pricing; no personal information is sent to this provider.
        </p>
        <p>
          These providers may process data on servers located outside
          Indonesia (see Section 9). We do not otherwise share your personal
          information with third parties, except where required by law, to
          protect our rights, or with your explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies">
        <p>
          We use only the minimal cookies strictly necessary to keep you
          signed in and to operate the Sites (authentication session
          cookies set by Supabase Auth). We do not currently use
          advertising or third-party tracking cookies. If this changes, we
          will update this policy.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>
          We keep account and order information for as long as your account
          is active and for a reasonable period afterward, to meet legal,
          accounting, and dispute-resolution obligations (including proof
          of payment and delivery for completed orders). Uploaded files tied
          to an order are retained alongside that order&rsquo;s records.
          You may request deletion of your account and associated data as
          described in Section 8, subject to the retention needs above.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Security">
        <p>
          We apply access controls at the database level (Row Level
          Security) so that order and payment data is only readable by the
          client who owns it and by authorised Nimia Studio staff. Payment
          verification is performed manually by our team against public
          blockchain records. No method of transmission or storage is 100%
          secure, and we cannot guarantee absolute security, but we work to
          use commercially reasonable safeguards appropriate to the data we
          hold.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>
          Depending on your location, you may have rights under applicable
          data protection law — including Indonesia&rsquo;s Personal Data
          Protection Law (Law No. 27 of 2022, &ldquo;UU PDP&rdquo;) — to:
        </p>
        <p>
          request access to the personal data we hold about you; request
          correction of inaccurate data; request deletion of your data,
          subject to our legitimate retention needs described in Section 6;
          object to or restrict certain processing; and request a copy of
          your data in a portable format.
        </p>
        <p>
          To exercise any of these rights, contact us using the details in
          Section 12. We will respond within a reasonable time.
        </p>
      </LegalSection>

      <LegalSection title="9. International Data Transfers">
        <p>
          Because we rely on providers such as Supabase, Cloudinary, Resend,
          and Vercel, your information may be processed on servers located
          outside Indonesia. Where this happens, we rely on those
          providers&rsquo; own security and compliance safeguards, and we
          only work with providers that are appropriate for the type of
          data described in this policy.
        </p>
      </LegalSection>

      <LegalSection title="10. Children's Privacy">
        <p>
          Our Services are intended for businesses and individuals capable
          of entering into a binding contract, and are not directed at
          children. We do not knowingly collect personal information from
          children. If you believe a child has provided us with personal
          information, please contact us so we can remove it.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time as our
          Services evolve. Material changes will be reflected by updating
          the &ldquo;Last updated&rdquo; date above, and, where appropriate,
          by additional notice such as an email to registered clients.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact Us">
        <p>
          Questions about this Privacy Policy or how your data is handled
          can be sent to{" "}
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
