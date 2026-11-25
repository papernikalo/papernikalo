export function PageFrame({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-14 pb-[72px] text-[#111827]">
      <header className="flex max-w-[760px] flex-col gap-3">
        <h1 className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="text-lg leading-[1.6] text-[#4B5563]">{summary}</p>
      </header>
      <div>{children}</div>
    </main>
  );
}
