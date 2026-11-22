import { registerAccount } from "@/lib/auth";
import { authFailure, authJson, readJson, rejectCrossSite } from "@/app/api/auth/http";

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request);
  if (rejected) return rejected;

  const body = await readJson(request);
  if (!body) return authJson({ error: "The account details were not valid." }, 400);

  try {
    const user = await registerAccount(body);
    return authJson({ user });
  } catch (error) {
    return authFailure(error, "The account could not be created.");
  }
}
