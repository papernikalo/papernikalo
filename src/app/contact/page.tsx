import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const page = publicPage("/contact");

export const metadata: Metadata = pageMetadata(page);

export default function ContactPage() {
  return (
    <LegalPage
      title={page.title}
      description="For a payment, a refund, or anything else about the site, use the details below."
    >
      <JsonLd data={pageJsonLd(page)} />
      <ContactFacts />
      <p>Hours: Monday to Saturday, 10:00 to 18:00 IST. Sunday is closed.</p>
      <p>
        For a payment, include the payment id from your receipt. Grievances about the
        service or a charge are handled at the email above.
      </p>
    </LegalPage>
  );
}
