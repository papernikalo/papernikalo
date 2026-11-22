import type { Metadata } from "next";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `What ${siteName} lists, and who runs it.`,
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About"
      description="Exam names from across India, plus tools for the photo and papers a form asks for."
    >
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
