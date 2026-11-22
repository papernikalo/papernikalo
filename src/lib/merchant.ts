/**
 * Public business details. Razorpay compares these with the account it reviews.
 * Email, address, and city are the public business details. Phone stays blank
 * until a real number is provided. Do not put a key secret here.
 */
export const merchant = {
  legalName: "PaperNikalo",
  email: "support@papernikalo.in",
  phone: "",
  address: "Bangalpara, 723121, Purulia, West Bengal",
  city: "Adra",
} as const;

export function published(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not published";
}
