import { readCurrentUser } from "@/lib/auth";
import { AuthError } from "@/lib/auth-config";

export async function requireAdmin() {
  const user = await readCurrentUser();
  if (!user) throw new AuthError("Sign in to add content.", 401);
  if (!user.admin) throw new AuthError("Only an admin can add content.", 403);
  return user;
}
