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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mx-auto max-w-3xl border-b border-[#d5dee6] pb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#52606d] sm:text-lg">{summary}</p>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}
