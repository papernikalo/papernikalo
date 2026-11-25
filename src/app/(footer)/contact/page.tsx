import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { PolicyNav } from "@/components/policy-pages";
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
      <PolicyNav />
      <ContactFacts />
      <div className="rounded-2xl border border-[#E3E6EB] bg-white px-5 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#C2410C] hover:bg-[#FFF7F2] hover:shadow-sm">
        <p className="text-xs font-semibold tracking-[0.06em] text-[#4B5563] uppercase">Hours</p>
        <p className="mt-2 text-[15px] font-semibold text-[#111827]">
          Monday to Saturday, 10:00 to 18:00 IST
        </p>
        <p className="mt-1 text-sm text-[#4B5563]">Sunday is closed.</p>
      </div>
      <p>
        For a payment, include the payment id from your receipt. Grievances about the service or a
        charge are handled at the email above.
      </p>
    </LegalPage>
  );
}
