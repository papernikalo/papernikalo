import { getDb } from "@/lib/mongo";

export type PaymentRecord = {
  userId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  productId: string;
  createdAt: Date;
};

export async function recordPayment(payment: Omit<PaymentRecord, "createdAt">) {
  const db = await getDb();
  await db.collection<PaymentRecord>("payments").updateOne(
    { paymentId: payment.paymentId },
    { $setOnInsert: { ...payment, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function listPayments(userId: string) {
  const db = await getDb();
  return db
    .collection<PaymentRecord>("payments")
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}
