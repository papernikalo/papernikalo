import { merchant, published } from "@/lib/merchant";

export function LegalPage({
  title,
  description,
  children,
  centered = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <main
      className={
        centered
          ? "mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8"
          : "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      }
    >
      <header className={centered ? "w-full max-w-md text-center" : "mx-auto max-w-3xl text-center"}>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#52606d] sm:text-lg">
          {description}
        </p>
      </header>
      <div
        className={
          centered
            ? "mt-8 w-full max-w-md"
            : "mx-auto mt-8 w-full max-w-3xl space-y-4 text-left text-[15px] leading-7 text-[#3d4a56] [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1c2834]"
        }
      >
        {children}
      </div>
    </main>
  );
}

export function ContactFacts() {
  const rows: [string, string][] = [
    ["Legal name", merchant.legalName],
    ["Email", merchant.email],
    ["Address", merchant.address],
    ["City", merchant.city],
  ];
  if (merchant.phone.trim()) rows.splice(2, 0, ["Phone", merchant.phone]);

  return (
    <dl className="grid gap-3 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5">
      {rows.map(([label, value]) => {
        const shown = published(value);
        return (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-3">
            <dt className="text-sm text-[#52606d]">{label}</dt>
            <dd>
              {label === "Email" && shown.includes("@") ? (
                <a href={`mailto:${shown}`} className="underline underline-offset-4">
                  {shown}
                </a>
              ) : (
                shown
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
