import type { Metadata } from "next";
import { SignInForm } from "@/components/auth-forms";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with the user id and password you chose.",
};

export default function SignInPage() {
  return (
    <LegalPage
      centered
      title="Sign in"
      description="Use the user id and password you set when you signed up."
    >
      <SignInForm />
    </LegalPage>
  );
}
