import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth-forms";
import { LegalPage } from "@/components/legal-page";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  path: "/signup",
  title: "Sign up",
  description: "Create an account with your name, a user id, password, email, and mobile number.",
});

export default function SignUpPage() {
  return (
    <LegalPage
      centered
      title="Sign up"
      description="Add your name, then pick a user id and password, and add your email and mobile number."
    >
      <SignUpForm />
    </LegalPage>
  );
}
