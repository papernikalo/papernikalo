import type { Metadata } from "next";
import Link from "next/link";
import { ContactFacts, LegalPage } from "@/components/legal-page";
import { merchant } from "@/lib/merchant";

export const metadata: Metadata = {
  title: "Cancellation and refunds",
  description: `How to cancel a ${merchant.legalName} payment and when a refund is sent.`,
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Cancellation and refunds"
      description="Cancellation and refunds are separate. Last updated 21 November 2026."
    >
      <h2>Cancellation</h2>
      <p>
        You can cancel before paying by closing the payment window. No charge is made for a window
        you close, or for a payment that fails.
      </p>
      <h2>Refunds</h2>
      <p>
        The form tools are available in the browser when the{" "}
        <Link href="/tools" className="underline underline-offset-4">
          tools
        </Link>{" "}
        page opens. If you were charged twice for one purchase, or you paid and the tools page does
        not open, write through the{" "}
        <Link href="/contact" className="underline underline-offset-4">
          contact
        </Link>{" "}
        page within 7 days. Include the payment id and the order id from the receipt.
      </p>
      <p>
        {merchant.legalName} replies within 3 business days. An approved refund is sent to the
        original payment method. Banks and UPI apps usually show that refund in 5
        to 7 business days after it is initiated. {merchant.legalName} does not take the refund in
        cash.
      </p>
      <p>
        A payment that was not captured has nothing to refund. These terms do not remove a remedy
        you have under Indian consumer law.
      </p>
      <h2>Where to write</h2>
      <ContactFacts />
    </LegalPage>
  );
}
