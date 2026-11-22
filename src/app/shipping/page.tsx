import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping",
  description: `${siteName} does not ship physical goods. The paid tools are delivered in the browser.`,
};

export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping and delivery"
      description={`${merchant.legalName} does not sell or ship physical goods.`}
    >
      <p>
        There is no courier, postage, or delivery charge. The form document tools are digital. After
        a captured payment, you use them in the browser on the{" "}
        <Link href="/tools" className="underline underline-offset-4">
          tools
        </Link>{" "}
        page. Nothing is posted to the address on the contact page.
      </p>
      <p>
        The subscribe price is the amount charged. Delivery is immediate because the tools open in
        your browser.
        If that page does not open after a captured payment, use the{" "}
        <Link href="/refunds" className="underline underline-offset-4">
          cancellation and refunds
        </Link>{" "}
        page.
      </p>
    </LegalPage>
  );
}
