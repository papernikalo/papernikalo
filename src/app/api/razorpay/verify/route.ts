import { readAccessUserId } from "@/lib/auth";
import { grantPaidService } from "@/lib/entitlements";
import { recordPayment } from "@/lib/payments";
import { PaymentError, verifyCheckoutPayment } from "@/lib/razorpay";
import { getSiteUrl } from "@/lib/site";

function sameSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === getSiteUrl() || origin === new URL(request.url).origin;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!sameSite(request)) {
    return json({ error: "This payment has to be confirmed on PaperNikalo." }, 403);
  }

  let claim = "";
  let paymentId = "";
  let checkoutOrderId = "";
  let signature = "";
  try {
    const body = (await request.json()) as {
      claim?: unknown;
      paymentId?: unknown;
      orderId?: unknown;
      signature?: unknown;
    };
    if (typeof body.claim === "string") claim = body.claim;
    if (typeof body.paymentId === "string") paymentId = body.paymentId;
    if (typeof body.orderId === "string") checkoutOrderId = body.orderId;
    if (typeof body.signature === "string") signature = body.signature;
  } catch {
    return json({ error: "The payment could not be confirmed." }, 400);
  }

  try {
    const payment = await verifyCheckoutPayment({
      claim,
      paymentId,
      checkoutOrderId,
      signature,
    });
    let access: { service: string; expiresAt: string } | null = null;
    try {
      const userId = await readAccessUserId();
      if (userId) {
        await recordPayment({
          userId,
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          amount: payment.amount,
          productId: payment.productId,
        });
        access = await grantPaidService(userId, payment.productId, payment.paymentId);
      }
    } catch (error) {
      console.error(error);
    }
    return json({
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      amount: payment.amount,
      access,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return json({ error: error.message }, error.status);
    }
    console.error(error);
    return json({ error: "The payment could not be confirmed." }, 500);
  }
}
