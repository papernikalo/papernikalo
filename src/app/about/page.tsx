import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";
import { siteName } from "@/lib/site";

const page = publicPage("/about");

export const metadata: Metadata = pageMetadata(page);

export default function AboutPage() {
  return (
    <LegalPage
      title={page.title}
      description="Exam names from across India, plus tools for the photo and papers a form asks for."
    >
      <JsonLd data={pageJsonLd(page)} />
      <p>
        {merchant.legalName} runs {siteName}. The list covers recruitment exams from Indian
        government bodies, and a name is linked when the official address is known. Vacancy
        counts, dates, and alerts here are examples. They are not the live notice.
      </p>
      <p>
        The paid part is the form tools: a photo, a signature, a plain background, and PDFs. The
        files are handled in your browser and are not sent to {siteName}.
      </p>
      <h2>Who to contact</h2>
      <ContactFacts />
    </LegalPage>
  );
}
