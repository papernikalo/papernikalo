import { Suspense } from "react";
import { AccountMenu } from "@/components/site-header";
import { readCurrentUser } from "@/lib/auth";

function AccountPlaceholder() {
  return <span aria-hidden className="inline-block h-9 w-9 rounded-full border border-[#d5dee6] bg-[#ffffff]" />;
}

async function ResolvedAccount() {
  const user = await readCurrentUser();
  return <AccountMenu initialUser={user} />;
}

export function AccountSlot() {
  return (
    <Suspense fallback={<AccountPlaceholder />}>
      <ResolvedAccount />
    </Suspense>
  );
}
