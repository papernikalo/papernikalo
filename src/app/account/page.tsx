import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Account",
  description: "Your name, profile picture, user id, email, and mobile number.",
};

export default function AccountPage() {
  return (
    <LegalPage title="Account" description="The name, profile picture, and contact details saved with your sign-in.">
      <AccountPanel />
    </LegalPage>
  );
}
