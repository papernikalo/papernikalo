import { PaymentError, createOrder } from "@/lib/razorpay";
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
    return json({ error: "This payment has to start on PaperNikalo." }, 403);
  }

  let productId = "";
  try {
    const body = (await request.json()) as { productId?: unknown };
    if (typeof body.productId === "string") productId = body.productId;
  } catch {
    return json({ error: "The payment request was not valid." }, 400);
  }

  try {
    return json(await createOrder(productId));
  } catch (error) {
    if (error instanceof PaymentError) {
      return json({ error: error.message }, error.status);
    }
    console.error(error);
    return json({ error: "The payment could not be started." }, 500);
  }
}
