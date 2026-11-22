/**
 * Prices charged by this site. The browser never chooses the amount.
 * `amountPaise` is Indian rupees times 100, which is the unit Razorpay requires.
 * Change this before taking live payments if ₹99 is not the price you will charge.
 */
export const formTools = {
  id: "form-tools",
  name: "Form document tools",
  summary:
    "Resize a form photo, crop a signature, clear the background, and get PDFs ready. The files stay on your device.",
  amountPaise: 9900,
} as const;

const products = [formTools];

export function productById(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
