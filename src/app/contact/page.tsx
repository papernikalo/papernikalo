import type { Metadata } from "next";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";

export const metadata: Metadata = {
  title: "Contact",
  description: `Email and postal address for ${merchant.legalName}.`,
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      description="For a payment, a refund, or anything else about the site, use the details below."
    >
      <ContactFacts />
      <p>Hours: Monday to Saturday, 10:00 to 18:00 IST. Sunday is closed.</p>
      <p>
        For a payment, include the payment id from your receipt. Grievances about the
        service or a charge are handled at the email above.
      </p>
    </LegalPage>
  );
}
