import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { ServicesBoard } from "@/components/services-board";
import { privatePageMetadata } from "@/lib/seo";
import { hasSessionCookie } from "@/lib/session-cookie";

export const metadata: Metadata = privatePageMetadata({
  path: "/services",
  title: "Services",
  description: "Typing, steno, or both. One service is ₹99 a month or ₹399 a year. Both together are ₹149 a month or ₹599 a year, a saving of ₹49 or ₹199.",
});

export const instant = false;

export default async function ServicesPage() {
  if (!(await hasSessionCookie())) redirect("/sign-in");

  return (
    <PageFrame
      title="Services"
      summary="Choose typing, steno, or both. One service is ₹99 a month or ₹399 a year. Both together are ₹149 a month or ₹599 a year, a saving of ₹49 or ₹199."
    >
      <ServicesBoard />
    </PageFrame>
  );
}
