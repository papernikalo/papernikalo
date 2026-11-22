"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { formatInr } from "@/lib/format";

type CheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type OrderPayload = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  image: string;
  claim: string;
};

type PaidReceipt = {
  paymentId: string;
  orderId: string;
  amount: number;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  image: string;
  order_id: string;
  handler: (response: CheckoutResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: { product_id: string };
  theme?: { color: string };
  remember_customer?: boolean;
  modal?: { confirm_close?: boolean; ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function RazorpayCheckout({
  productId,
  businessName,
}: {
  productId: string;
  businessName: string;
}) {
  const router = useRouter();
  const { user, ready: signedIn } = useAuth();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const savedEmail = user?.email ?? "";
  const savedMobile = user?.mobile ?? "";
  const savedName = user?.name ?? "";

  useEffect(() => {
    if (signedIn && !user) router.replace("/sign-in");
  }, [signedIn, user, router]);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<PaidReceipt | null>(null);
  const settled = useRef(false);

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setNotice("");

    const contact = savedMobile.replace(/\s+/g, "");
    const payerEmail = savedEmail.trim();
    if (!user) return;
    if (!ready || !window.Razorpay) {
      setNotice("The payment window is still loading. Try again in a moment.");
      return;
    }

    setBusy(true);
    settled.current = false;
    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const order = (await response.json()) as OrderPayload & { error?: string };
      if (!response.ok) {
        setNotice(order.error || "The payment could not be started.");
        setBusy(false);
        return;
      }

      const prefill: { name?: string; email?: string; contact?: string } = {};
      if (savedName.trim()) prefill.name = savedName.trim();
      if (payerEmail) prefill.email = payerEmail;
      if (contact) prefill.contact = contact;

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: businessName,
        description: order.name,
        image: order.image,
        order_id: order.orderId,
        remember_customer: false,
        notes: { product_id: productId },
        theme: { color: "#1d4e89" },
        prefill,
        modal: {
          confirm_close: true,
          ondismiss() {
            if (settled.current) return;
            setBusy(false);
            setNotice("The payment window was closed. You have not been charged.");
          },
        },
        handler(result) {
          settled.current = true;
          void confirmPayment(order.claim, result);
        },
      });
      checkout.on("payment.failed", (failed) => {
        settled.current = true;
        setBusy(false);
        setNotice(failed.error?.description || "The payment was not completed.");
      });
      checkout.open();
    } catch {
      setBusy(false);
      setNotice("The payment could not be started.");
    }
  }

  async function confirmPayment(claim: string, result: CheckoutResponse) {
    try {
      const response = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim,
          paymentId: result.razorpay_payment_id,
          orderId: result.razorpay_order_id,
          signature: result.razorpay_signature,
        }),
      });
      const body = (await response.json()) as PaidReceipt & { error?: string };
      if (!response.ok) {
        setNotice(body.error || "The payment could not be confirmed.");
        return;
      }
      setReceipt(body);
      setNotice("");
    } catch {
      setNotice("The payment could not be confirmed.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <section className="w-full rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5" aria-live="polite">
        <h2 className="text-lg font-semibold text-[#1c2834]">Payment confirmed</h2>
        <p className="mt-2">
          {formatInr(receipt.amount)} was captured for {businessName}. This receipt was checked on
          the PaperNikalo server.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr]">
            <dt className="text-[#52606d]">Payment id</dt>
            <dd className="font-mono">{receipt.paymentId}</dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr]">
            <dt className="text-[#52606d]">Order id</dt>
            <dd className="font-mono">{receipt.orderId}</dd>
          </div>
        </dl>
        <p className="mt-4">
          <Link href="/tools" className="underline underline-offset-4">
            Open the form tools
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form className="grid w-full gap-4 rounded-2xl border border-[#d5dee6] bg-[#ffffff] p-4 sm:p-6" onSubmit={pay}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setNotice("The payment window could not be loaded.")}
      />
      {user ? null : <p className="text-sm leading-6 text-[#52606d]">Loading your account…</p>}
      <button
        type="submit"
        disabled={busy || !user}
        className="w-full rounded-full bg-[#1c2834] px-4 py-2.5 text-sm font-medium text-[#f3f5f7] disabled:cursor-default disabled:opacity-60"
      >
        {busy ? "Opening payment…" : "Subscribe"}
      </button>
      <p className="text-sm leading-6 text-[#52606d]">
        By paying you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4">
          terms
        </Link>{" "}
        and the{" "}
        <Link href="/refunds" className="underline underline-offset-4">
          cancellation and refund policy
        </Link>
        .
      </p>
      {notice ? (
        <p className="text-sm text-[#1d4e89]" role="status">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
