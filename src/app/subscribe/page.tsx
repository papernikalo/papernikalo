import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RazorpayCheckout } from "@/components/razorpay-checkout";
import { LegalPage } from "@/components/legal-page";
import { formTools } from "@/lib/catalog";
import { formatInr } from "@/lib/format";
import { merchant } from "@/lib/merchant";
import { hasSessionCookie } from "@/lib/session-cookie";

export const metadata: Metadata = {
  title: "Subscribe",
  description: `${formTools.name} is ${formatInr(formTools.amountPaise)}.`,
};

export const instant = false;

export default async function SubscribePage() {
  if (!(await hasSessionCookie())) redirect("/sign-in");

  return (
    <LegalPage centered title="Subscribe" description={formTools.name}>
      <p className="text-center text-3xl font-semibold tracking-tight text-[#1c2834]">
        {formatInr(formTools.amountPaise)}
      </p>
      <div className="mt-6">
        <RazorpayCheckout productId={formTools.id} businessName={merchant.legalName} />
      </div>
    </LegalPage>
  );
}
