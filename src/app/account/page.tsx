import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { PageFrame } from "@/components/page-frame";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  path: "/account",
  title: "Account",
  description: "Your name, profile picture, user id, email, and mobile number.",
});

export default function AccountPage() {
  return (
    <PageFrame title="Account" summary="Your name, picture, and the contact details saved with this sign-in.">
      <AccountPanel />
    </PageFrame>
  );
}
