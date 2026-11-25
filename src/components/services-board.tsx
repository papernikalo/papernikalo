"use client";

import { useEffect, useState } from "react";
import { RazorpayCheckout } from "@/components/razorpay-checkout";
import { serviceOffers, type BillingPeriod, type ServiceId } from "@/lib/catalog";
import type { ServiceAccess } from "@/lib/entitlements";
import { formatInr } from "@/lib/format";
import { merchant } from "@/lib/merchant";

function formatUntil(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const singlePrice = { month: 9900, year: 39900 };
const pairPrice = { month: 14900, year: 59900 };

export function ServicesBoard() {
  const [access, setAccess] = useState<ServiceAccess[] | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<ServiceId[]>(["typing", "steno"]);
  const [period, setPeriod] = useState<BillingPeriod>("year");

  function load() {
    return fetch("/api/account/services")
      .then(async (response) => {
        const body = (await response.json()) as { services?: ServiceAccess[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Services could not be loaded.");
        setAccess(body.services ?? []);
        setNote("");
      })
      .catch((reason: unknown) => {
        setNote(reason instanceof Error ? reason.message : "Services could not be loaded.");
      });
  }

  useEffect(() => {
    const pending = load();
    return () => {
      void pending;
    };
  }, []);

  function toggle(id: ServiceId) {
    setPicked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const both = picked.includes("typing") && picked.includes("steno");
  const productId = both
    ? period === "month"
      ? "both-month"
      : "both-year"
    : picked.length === 1
      ? `${picked[0]}-${period}`
      : "";
  const amountPaise = both ? pairPrice[period] : picked.length === 1 ? singlePrice[period] : 0;
  const savedPaise = both ? singlePrice[period] * 2 - pairPrice[period] : 0;
  const lengthLabel = period === "month" ? "1 month" : "1 year";
  const selectionLabel = both
    ? "Typing and steno"
    : picked.length === 1
      ? (serviceOffers.find((offer) => offer.id === picked[0])?.name ?? "Service")
      : "No service selected";

  return (
    <div className="grid gap-5">
      {note ? <p className="text-sm font-medium text-[#B91C1C]">{note}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#111827]">Length</p>
        <div className="relative grid w-full max-w-[280px] grid-cols-2 rounded-full bg-[#E8EAEE] p-1">
          <span
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{ transform: period === "year" ? "translateX(100%)" : "translateX(0)" }}
          />
          {(
            [
              ["month", "1 month"],
              ["year", "1 year"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={`relative z-10 min-h-10 rounded-full text-sm font-semibold transition-colors ${
                period === value ? "text-[#111827]" : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {serviceOffers.map((offer) => {
          const selected = picked.includes(offer.id);
          const item = access?.find((entry) => entry.id === offer.id) ?? null;
          const accent = "#C2410C";
          const wash = "#FFF7F2";
          return (
            <button
              key={offer.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(offer.id)}
              className="group flex min-h-[210px] flex-col gap-3 rounded-2xl border-2 p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-7"
              style={
                selected
                  ? { borderColor: accent, background: wash }
                  : { borderColor: "#E3E6EB", background: "#ffffff" }
              }
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-display text-2xl font-bold text-[#111827]">{offer.name}</span>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition duration-200 group-hover:scale-105"
                  style={
                    selected
                      ? { borderColor: accent, background: accent, color: "#ffffff" }
                      : { borderColor: "#D1D5DB", background: "#ffffff", color: "#9CA3AF" }
                  }
                >
                  {selected ? "✓" : "+"}
                </span>
              </span>
              <span className="text-[15px] leading-relaxed text-[#4B5563]">{offer.summary}</span>
              <span className="text-sm font-semibold" style={{ color: item?.active ? accent : "#4B5563" }}>
                {item?.active && item.expiresAt
                  ? `Active until ${formatUntil(item.expiresAt)}`
                  : "Not active on this account"}
              </span>
              <span className="mt-auto flex items-end justify-between gap-3 pt-2">
                <span>
                  <span className="block font-display text-3xl font-bold text-[#111827]">
                    {formatInr(singlePrice[period])}
                  </span>
                  <span className="text-sm text-[#4B5563]">alone for {lengthLabel}</span>
                </span>
                <span
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition duration-200"
                  style={
                    selected
                      ? { background: accent, color: "#ffffff" }
                      : { background: "#F3F4F6", color: "#374151" }
                  }
                >
                  {selected ? "Added" : "Add"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <section className="grid gap-5 rounded-2xl border border-[#E3E6EB] bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="font-display text-xl font-bold text-[#111827]">{selectionLabel}</h2>
            <div className="flex flex-wrap gap-2">
              {picked.length ? (
                picked.map((id) => {
                  const offer = serviceOffers.find((entry) => entry.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-sm font-semibold text-[#111827] hover:bg-[#E5E7EB]"
                    >
                      {offer?.name} ×
                    </button>
                  );
                })
              ) : (
                <span className="text-sm text-[#4B5563]">Tap a service above to add it.</span>
              )}
            </div>
            {both ? (
              <p className="text-sm text-[#4B5563]">
                Each service alone is {formatInr(singlePrice[period])}. Together they are priced as one.
              </p>
            ) : picked.length === 1 ? (
              <p className="text-sm text-[#4B5563]">
                Add the other service and save {formatInr(singlePrice[period] * 2 - pairPrice[period])} on {lengthLabel}.
              </p>
            ) : null}
          </div>
          <div className="grid justify-items-end gap-1" aria-live="polite">
            {both ? (
              <span className="text-sm text-[#4B5563] line-through">{formatInr(singlePrice[period] * 2)}</span>
            ) : null}
            <p className="font-display text-4xl font-bold tracking-tight text-[#111827]">
              {amountPaise ? formatInr(amountPaise) : "—"}
            </p>
            {both ? (
              <span className="rounded-full bg-[#FFF7F2] px-3 py-1 text-sm font-semibold text-[#C2410C]">
                Save {formatInr(savedPaise)}
              </span>
            ) : null}
          </div>
        </div>
        {productId ? (
          <RazorpayCheckout
            key={productId}
            productId={productId}
            businessName={merchant.legalName}
            buttonLabel={`Pay ${formatInr(amountPaise)} for ${lengthLabel}`}
            onPaid={() => void load()}
          />
        ) : (
          <p className="text-right text-sm text-[#4B5563]">Add typing, steno, or both to pay.</p>
        )}
      </section>
    </div>
  );
}

export function AccountServices({ serviceId }: { serviceId?: ServiceId }) {
  const [access, setAccess] = useState<ServiceAccess[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/services")
      .then(async (response) => {
        const body = (await response.json()) as { services?: ServiceAccess[] };
        if (!cancelled && response.ok) setAccess(body.services ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = (access ?? []).filter((item) => !serviceId || item.id === serviceId);
  if (!rows.length) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((item) => {
        const offer = serviceOffers.find((entry) => entry.id === item.id);
        return (
          <p key={item.id} className="rounded-[10px] bg-[#F6F7F9] px-4 py-3 text-sm text-[#111827]">
            <span className="font-semibold">{offer?.name ?? item.id}</span>
            <span className="mt-1 block text-[#4B5563]">
              {item.active && item.expiresAt ? `Active until ${formatUntil(item.expiresAt)}` : "Not active"}
            </span>
          </p>
        );
      })}
    </div>
  );
}
