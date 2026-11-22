import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TransactionList } from "@/components/transaction-list";
import { LegalPage } from "@/components/legal-page";
import { hasSessionCookie } from "@/lib/session-cookie";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Payments captured for your PaperNikalo account.",
};

export const instant = false;

export default async function TransactionsPage() {
  if (!(await hasSessionCookie())) redirect("/sign-in");

  return (
    <LegalPage title="Transactions" description="Payments captured for this account, newest first.">
      <TransactionList />
    </LegalPage>
  );
}
