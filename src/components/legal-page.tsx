import { CopyValue } from "@/components/policy-pages";
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
          ? "mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center px-6 py-14 pb-[72px] text-[#111827]"
          : "mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-14 pb-[72px] text-[#111827]"
      }
    >
      <header className={centered ? "flex w-full max-w-md flex-col gap-3 text-center" : "flex max-w-[760px] flex-col gap-3"}>
        <h1 className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="text-lg leading-[1.6] text-[#4B5563]">{description}</p>
      </header>
      <div
        className={
          centered
            ? "mt-8 w-full max-w-md"
            : "w-full space-y-4 text-[15px] leading-7 text-[#4B5563] [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#111827] [&>p]:max-w-3xl"
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
  ];
  if (merchant.phone.trim()) rows.splice(2, 0, ["Phone", merchant.phone]);

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => {
        const shown = published(value);
        const email = label === "Email" && shown.includes("@");
        return (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-2xl border border-[#E3E6EB] bg-white px-5 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#C2410C] hover:bg-[#FFF7F2] hover:shadow-sm"
          >
            <dt className="text-xs font-semibold tracking-[0.06em] text-[#4B5563] uppercase">{label}</dt>
            <dd className="flex flex-wrap items-center justify-between gap-3 text-[15px] font-semibold text-[#111827]">
              {email ? (
                <a href={`mailto:${shown}`} className="underline underline-offset-4 hover:text-[#C2410C]">
                  {shown}
                </a>
              ) : (
                <span>{shown}</span>
              )}
              {shown !== "Not published" ? <CopyValue value={shown} /> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
