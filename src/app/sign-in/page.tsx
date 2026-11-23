import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { LegalPage } from "@/components/legal-page";
import { readCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with the user id and password you chose.",
};

export const instant = false;

export default async function SignInPage() {
  if (await readCurrentUser()) redirect("/");

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
