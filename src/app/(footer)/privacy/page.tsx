import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LegalPage } from "@/components/legal-page";
import { PolicyAccordion, PolicyNav } from "@/components/policy-pages";
import { merchant } from "@/lib/merchant";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";
import { siteName } from "@/lib/site";

const page = publicPage("/privacy");

export const metadata: Metadata = pageMetadata(page);

export default function PrivacyPage() {
  return (
    <LegalPage
      title={page.title}
      description={`How ${merchant.legalName} handles information on ${siteName}. Last updated 21 November 2026.`}
    >
      <JsonLd data={pageJsonLd(page)} />
      <PolicyNav />
      <p>
        You can read the pages without an account. If you sign up, we keep your name, user id,
        email, and mobile number. A profile picture you add on the account page is kept with that
        account. The password is saved in a form that cannot be read back. We check the sign-in
        again every 5 minutes.
      </p>
      <PolicyAccordion
        items={[
          {
            id: "collected",
            title: "What is collected",
            children: (
              <>
                <p>
                  A payment is available only after you sign in. It uses the name, email, and mobile number
                  from your account so the payment window can show them. {siteName} does not keep a separate
                  copy of the payment form.
                </p>
                <p className="mt-3">
                  After a payment, the server receives the order id, payment id, and signature. It uses them
                  only to check that the amount was captured for the order this server created. Card numbers,
                  UPI PINs, and netbanking passwords are entered in the payment window and are not sent to{" "}
                  {siteName}.
                </p>
                <p className="mt-3">
                  The host may keep a technical log of the address that requested a page, the time, and the
                  path. That log is used to run and protect the site.
                </p>
              </>
            ),
          },
          {
            id: "shared",
            title: "Who it is shared with",
            children: (
              <p>
                The company that takes the payment handles the card, UPI, or netbanking details under its
                own privacy policy. {merchant.legalName} does not sell personal information.
              </p>
            ),
          },
          {
            id: "kept",
            title: "How long it is kept",
            children: (
              <p>
                Account details stay until you ask for the account to be deleted. The payment record is
                kept by the company that took the payment. A technical log is kept only as long as the
                host needs it for security. Payment card numbers are not stored here.
              </p>
            ),
          },
          {
            id: "request",
            title: "Your request",
            children: (
              <p>
                To ask about a payment, or for a correction or deletion of information {merchant.legalName}{" "}
                actually holds, write through the{" "}
                <Link href="/contact" className="underline underline-offset-4">
                  contact
                </Link>{" "}
                page and include the payment id.
              </p>
            ),
          },
        ]}
      />
    </LegalPage>
  );
}
