import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LegalPage } from "@/components/legal-page";
import { PolicyNav } from "@/components/policy-pages";
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
      <PolicyNav />
      <p>
        {merchant.legalName} runs {siteName}. The list covers recruitment exams from Indian
        government bodies, and a name is linked when the official address is known. Vacancy
        counts, dates, and alerts here are examples. They are not the live notice.
      </p>
      <p>
        The paid part is the form tools: a photo, a signature, a plain background, and PDFs. The
        files are handled in your browser and are not sent to {siteName}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/typing", title: "Typing", text: "Exam-style typing tests.", accent: "#C2410C" },
          { href: "/steno", title: "Steno", text: "Dictation practice and tests.", accent: "#C2410C" },
          { href: "/tools", title: "Tools", text: "Photo, signature, and PDF tools in your browser.", accent: "#C2410C" },
          { href: "/contact", title: "Contact", text: "Questions about a payment or the site.", accent: "#C2410C" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-2 rounded-2xl border border-[#E3E6EB] bg-white p-5 no-underline transition duration-200 hover:-translate-y-0.5 hover:border-[#C2410C] hover:bg-[#FFF7F2] hover:shadow-md"
          >
            <span className="font-display text-xl font-bold text-[#111827] group-hover:underline">{item.title}</span>
            <span className="text-sm leading-6 text-[#4B5563]">{item.text}</span>
            <span className="text-sm font-semibold" style={{ color: item.accent }}>
              Open
            </span>
          </Link>
        ))}
      </div>
    </LegalPage>
  );
}
