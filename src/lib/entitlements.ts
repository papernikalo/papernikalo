import { productById, serviceOffers, type ServiceId } from "@/lib/catalog";
import { getDb } from "@/lib/mongo";

type UserServices = {
  userId: string;
  services?: Partial<Record<ServiceId, Date>>;
};

export type ServiceAccess = {
  id: ServiceId;
  active: boolean;
  expiresAt: string | null;
};

function addPeriod(from: Date, period: "month" | "year") {
  const next = new Date(from.getTime());
  if (period === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

export async function listServiceAccess(userId: string): Promise<ServiceAccess[]> {
  const db = await getDb();
  const user = await db.collection<UserServices>("users").findOne({ userId }, { projection: { services: 1 } });
  const now = Date.now();
  return serviceOffers.map((offer) => {
    const expires = user?.services?.[offer.id];
    const active = expires instanceof Date && expires.getTime() > now;
    return {
      id: offer.id,
      active,
      expiresAt: expires instanceof Date ? expires.toISOString() : null,
    };
  });
}

/** Extends every service on the payment once. A repeat call for the same payment does nothing. */
export async function grantPaidService(userId: string, productId: string, paymentId: string) {
  const product = productById(productId);
  if (!product?.services?.length || !product.period) return null;
  const services = product.services;
  const period = product.period;

  const db = await getDb();
  const grants = db.collection("serviceGrants");
  const inserted = await grants.updateOne(
    { paymentId },
    {
      $setOnInsert: {
        paymentId,
        userId,
        productId,
        services,
        period,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  const users = db.collection<UserServices>("users");
  if (inserted.upsertedCount !== 1) {
    const user = await users.findOne({ userId }, { projection: { services: 1 } });
    const expires = user?.services?.[services[0]];
    return expires instanceof Date ? { service: services.join(","), expiresAt: expires.toISOString() } : null;
  }

  try {
    const user = await users.findOne({ userId }, { projection: { services: 1 } });
    const now = Date.now();
    const update: Record<string, Date> = {};
    for (const service of services) {
      const current = user?.services?.[service];
      const start = current instanceof Date && current.getTime() > now ? current : new Date();
      update[`services.${service}`] = addPeriod(start, period);
    }
    const updated = await users.updateOne({ userId }, { $set: update });
    if (!updated.matchedCount) throw new Error("The account for this payment was not found.");
    const first = update[`services.${services[0]}`];
    return { service: services.join(","), expiresAt: first.toISOString() };
  } catch (error) {
    await grants.deleteOne({ paymentId });
    throw error;
  }
}
