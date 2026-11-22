import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { productById } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

const ORDER_HOURS = 2;

export class PaymentError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Claim = {
  orderId: string;
  productId: string;
  amount: number;
  exp: number;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

function keys() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || keySecret.length < 8) {
    throw new PaymentError("Payments are not available right now.", 503);
  }
  return { keyId, keySecret };
}

function webhookSecret() {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  if (secret.length < 8) {
    throw new PaymentError("Webhook is not configured.", 503);
  }
  return secret;
}

function sameText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signClaim(claim: Claim, secret: string) {
  const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readClaim(token: string, secret: string): Claim {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new PaymentError("This payment session is not valid.", 400);
  }
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!sameText(expected, signature)) {
    throw new PaymentError("This payment session is not valid.", 400);
  }

  let claim: Claim;
  try {
    claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claim;
  } catch {
    throw new PaymentError("This payment session is not valid.", 400);
  }

  const product = productById(claim.productId);
  if (
    !product ||
    claim.amount !== product.amountPaise ||
    typeof claim.orderId !== "string" ||
    !claim.orderId.startsWith("order_") ||
    typeof claim.exp !== "number"
  ) {
    throw new PaymentError("This payment session is not valid.", 400);
  }
  if (claim.exp < Date.now()) {
    throw new PaymentError("This payment session has expired. Start the payment again.", 400);
  }
  return claim;
}

async function razorpay(path: string, init?: { method?: string; body?: string }) {
  const { keyId, keySecret } = keys();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init?.method ?? "GET",
    body: init?.body,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { error?: { description?: string } }) : {};
  if (!response.ok) {
    console.error("Razorpay request failed", response.status, data.error?.description ?? "");
    throw new PaymentError("The payment service did not accept that request.", 502);
  }
  return data;
}

export async function createOrder(productId: string) {
  const product = productById(productId);
  if (!product || !Number.isInteger(product.amountPaise) || product.amountPaise < 100) {
    throw new PaymentError("That item is not for sale.", 400);
  }

  const { keyId, keySecret } = keys();
  const receipt = `pn_${randomBytes(8).toString("hex")}`;
  const order = (await razorpay("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: product.amountPaise,
      currency: "INR",
      receipt,
      notes: { product_id: product.id },
    }),
  })) as { id?: string; amount?: number; currency?: string; status?: string };

  if (
    order.status !== "created" ||
    order.currency !== "INR" ||
    order.amount !== product.amountPaise ||
    !order.id?.startsWith("order_")
  ) {
    throw new PaymentError("The payment service did not accept that request.", 502);
  }

  return {
    keyId,
    orderId: order.id,
    amount: product.amountPaise,
    currency: "INR" as const,
    name: product.name,
    description: product.summary,
    image: absoluteUrl("/favicon.ico"),
    claim: signClaim(
      {
        orderId: order.id,
        productId: product.id,
        amount: product.amountPaise,
        exp: Date.now() + ORDER_HOURS * 60 * 60 * 1000,
      },
      keySecret,
    ),
  };
}

async function capturedPayment(claim: Claim, paymentId: string) {
  let payment = (await razorpay(`/payments/${encodeURIComponent(paymentId)}`)) as RazorpayPayment;
  if (
    payment.id !== paymentId ||
    payment.order_id !== claim.orderId ||
    payment.amount !== claim.amount ||
    payment.currency !== "INR"
  ) {
    throw new PaymentError("The payment could not be confirmed.", 400);
  }

  if (payment.status === "authorized") {
    try {
      payment = (await razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: claim.amount, currency: "INR" }),
      })) as RazorpayPayment;
    } catch (error) {
      payment = (await razorpay(`/payments/${encodeURIComponent(paymentId)}`)) as RazorpayPayment;
      if (payment.status !== "captured") throw error;
    }
  }

  if (payment.status !== "captured") {
    throw new PaymentError("The payment could not be confirmed.", 400);
  }
  return payment;
}

export async function verifyCheckoutPayment(input: {
  claim: string;
  paymentId: string;
  checkoutOrderId: string;
  signature: string;
}) {
  if (!/^pay_[A-Za-z0-9]+$/.test(input.paymentId) || !/^[a-f0-9]{64}$/.test(input.signature)) {
    throw new PaymentError("The payment could not be confirmed.", 400);
  }

  const { keySecret } = keys();
  const claim = readClaim(input.claim, keySecret);
  if (input.checkoutOrderId !== claim.orderId) {
    throw new PaymentError("The payment could not be confirmed.", 400);
  }

  // Razorpay requires this digest from the order id stored by us, not a substituted one.
  const expected = createHmac("sha256", keySecret)
    .update(`${claim.orderId}|${input.paymentId}`)
    .digest("hex");
  if (!sameText(expected, input.signature)) {
    throw new PaymentError("The payment could not be confirmed.", 400);
  }

  const payment = await capturedPayment(claim, input.paymentId);
  return {
    paymentId: payment.id,
    orderId: claim.orderId,
    amount: claim.amount,
    productId: claim.productId,
  };
}

export function readWebhook(rawBody: string, header: string | null) {
  if (!header) {
    throw new PaymentError("Missing webhook signature.", 400);
  }
  const expected = createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
  if (!sameText(expected, header)) {
    throw new PaymentError("Invalid webhook signature.", 400);
  }

  let event: { event?: string };
  try {
    event = JSON.parse(rawBody) as { event?: string };
  } catch {
    throw new PaymentError("Invalid webhook body.", 400);
  }
  return event.event ?? "";
}
