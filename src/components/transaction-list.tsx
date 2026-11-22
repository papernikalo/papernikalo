"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { formatInr } from "@/lib/format";

type Transaction = {
  paymentId: string;
  orderId: string;
  amount: number;
  name: string;
  createdAt: string;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TransactionList() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    fetch("/api/account/transactions")
      .then(async (response) => {
        const body = (await response.json()) as { transactions?: Transaction[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Transactions could not be loaded.");
        return body.transactions ?? [];
      })
      .then((transactions) => {
        if (!cancelled) setRows(transactions);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Transactions could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (!ready || (user && !rows && !error)) {
    return <p className="text-[#52606d]">Loading transactions…</p>;
  }

  if (!user) {
    return (
      <p>
        <Link href="/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>{" "}
        to see transactions.
      </p>
    );
  }

  if (error) {
    return <p className="text-[#1d4e89]">{error}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#d5dee6] bg-[#ffffff]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {["Date", "Item", "Amount", "Payment id", "Order id"].map((heading) => (
              <th
                key={heading}
                className="border-b border-[#d5dee6] px-3 py-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-[#52606d] uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            rows.map((row) => (
              <tr
                key={row.paymentId}
                className="[&>td]:border-b [&>td]:border-[#d5dee6] [&>td]:px-3 [&>td]:py-2 [&>td]:align-top"
              >
                <td className="whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                <td>{row.name}</td>
                <td className="whitespace-nowrap font-medium tabular-nums">{formatInr(row.amount)}</td>
                <td className="font-mono text-xs">{row.paymentId}</td>
                <td className="font-mono text-xs">{row.orderId}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-3 py-3 text-[#52606d]">
                No payments yet.{" "}
                <Link href="/subscribe" className="underline underline-offset-4">
                  Subscribe
                </Link>{" "}
                when you are ready. The charge is saved here after it is captured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
