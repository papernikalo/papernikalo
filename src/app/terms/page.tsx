import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";
import { siteName } from "@/lib/site";

const page = publicPage("/terms");

export const metadata: Metadata = pageMetadata(page);

export default function TermsPage() {
  const courts = merchant.city.trim()
    ? `the courts at ${merchant.city.trim()}`
    : "the courts in India";

  return (
    <LegalPage
      title={page.title}
      description={`These terms apply to ${siteName}. Last updated 21 November 2026.`}
    >
      <JsonLd data={pageJsonLd(page)} />
      <p>
        {merchant.legalName} offers {siteName}. Using the site or paying for the form tools means
        you accept these terms.
      </p>
      <h2>The service</h2>
      <p>
        The site shows recruitment names and sample listings. A linked name opens that body&apos;s
        own website. Sample vacancies, dates, and alerts are not official notifications, and they
        are not an application form. The form document tools run in your browser. {siteName} does
        not upload those files and does not submit an application for you.
      </p>
      <h2>Price and payment</h2>
      <p>
        The price is shown in Indian rupees and is the amount charged. You enter card, UPI, or
        netbanking details only in the payment window. A payment is complete when that window
        confirms the amount and this server checks it. Closing the window before that is not a
        purchase.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not use the site to break the law, to interfere with it, or to present a sample listing
        as an official result or admit card.
      </p>
      <h2>Contact and disputes</h2>
      <ContactFacts />
      <p>
        Questions go to the{" "}
        <Link href="/contact" className="underline underline-offset-4">
          contact
        </Link>{" "}
        page. Indian law applies. Disputes are subject to {courts}.
      </p>
    </LegalPage>
  );
}
