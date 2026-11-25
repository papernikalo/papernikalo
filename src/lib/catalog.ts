/**
 * Prices charged by this site. The browser never chooses the amount.
 * `amountPaise` is Indian rupees times 100, which is the unit Razorpay requires.
 */
export type ServiceId = "typing" | "steno";
export type BillingPeriod = "month" | "year";

export type Product = {
  id: string;
  name: string;
  summary: string;
  amountPaise: number;
  services?: ServiceId[];
  period?: BillingPeriod;
};

export const formTools: Product = {
  id: "form-tools",
  name: "Form document tools",
  summary:
    "Resize a form photo, crop a signature, clear the background, and get PDFs ready. The files stay on your device.",
  amountPaise: 9900,
};

export const serviceOffers = [
  {
    id: "typing" as const,
    name: "Typing practice",
    summary: "Exam-style typing tests on this account, for the month or the year you pay for.",
    plans: [
      { id: "typing-month", period: "month" as const, amountPaise: 9900, label: "1 month" },
      { id: "typing-year", period: "year" as const, amountPaise: 39900, label: "1 year" },
    ],
  },
  {
    id: "steno" as const,
    name: "Steno",
    summary: "Dictation practice and tests on this account, for the month or the year you pay for.",
    plans: [
      { id: "steno-month", period: "month" as const, amountPaise: 9900, label: "1 month" },
      { id: "steno-year", period: "year" as const, amountPaise: 39900, label: "1 year" },
    ],
  },
];

const products: Product[] = [
  formTools,
  ...serviceOffers.flatMap((offer) =>
    offer.plans.map((plan) => ({
      id: plan.id,
      name: `${offer.name} · ${plan.label}`,
      summary: offer.summary,
      amountPaise: plan.amountPaise,
      services: [offer.id],
      period: plan.period,
    })),
  ),
  {
    id: "both-month",
    name: "Typing practice and steno · 1 month",
    summary: "Both services on this account for one month.",
    amountPaise: 14900,
    services: ["typing", "steno"],
    period: "month",
  },
  {
    id: "both-year",
    name: "Typing practice and steno · 1 year",
    summary: "Both services on this account for one year.",
    amountPaise: 59900,
    services: ["typing", "steno"],
    period: "year",
  },
];

export function productById(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
