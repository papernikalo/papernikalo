import { authFailure, authJson } from "@/app/api/auth/http";
import { readAccessUserId } from "@/lib/auth";
import { productById } from "@/lib/catalog";
import { listPayments } from "@/lib/payments";

export async function GET() {
  try {
    const userId = await readAccessUserId();
    if (!userId) return authJson({ error: "Sign in to see transactions." }, 401);
    const payments = await listPayments(userId);
    return authJson({
      transactions: payments.map((payment) => ({
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        name: productById(payment.productId)?.name ?? "Payment",
        createdAt: payment.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return authFailure(error, "Transactions could not be loaded.");
  }
}
