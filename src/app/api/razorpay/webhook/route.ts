import { PaymentError, readWebhook } from "@/lib/razorpay";

const handled = new Set([
  "payment.authorized",
  "payment.captured",
  "payment.failed",
  "order.paid",
  "refund.processed",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const event = readWebhook(rawBody, request.headers.get("x-razorpay-signature"));
    if (event && !handled.has(event)) {
      console.info("Razorpay webhook acknowledged", event);
    }
    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error(error);
    return Response.json(
      { error: "Webhook failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
