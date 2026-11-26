"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  passageLanguages,
  stenoTopics,
  typingWordsPerMinute,
  type SavedStenoDictation,
  type SavedTypingPassage,
} from "@/lib/content-fields";
import { examBodies, examBodyName } from "@/lib/exam-bodies";

const fieldClass =
  "w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#C2410C]";

type NamedOption = { id: string; name: string };

export type AdminStats = {
  accounts: number;
  typingAttempts: number;
  stenoAttempts: number;
  builtinTyping: number;
  builtinSteno: number;
};

export function AdminEditor({
  name,
  typing,
  steno,
  customExams,
  customDictations,
  stats,
}: {
  name: string;
  typing: SavedTypingPassage[];
  steno: SavedStenoDictation[];
  customExams: NamedOption[];
  customDictations: NamedOption[];
  stats: AdminStats;
}) {
  const [tab, setTab] = useState<"typing" | "steno">("typing");
  const passages = [...typing].reverse();
  const dictations = [...steno].reverse();
  const typingWords = typing.reduce((sum, item) => sum + countWords(item.text), 0);
  const englishWords = steno.reduce((sum, item) => sum + countWords(item.english), 0);
  const hindiWords = steno.reduce((sum, item) => sum + countWords(item.hindi), 0);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-10 pb-16 text-[#111827]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-[0.08em] text-[#C2410C] uppercase">Admin</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Content</h1>
          <p className="max-w-xl text-base text-[#4B5563]">
            Signed in as {name}. Passages and dictations saved here are added to the practice pages.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Accounts" value={stats.accounts} note="People who can sign in" />
        <Stat label="Typing attempts" value={stats.typingAttempts} note="Tests saved on accounts" />
        <Stat label="Steno attempts" value={stats.stenoAttempts} note="Tests saved on accounts" />
        <Stat
          label="Your library"
          value={typing.length + steno.length}
          note={`${typing.length} passages · ${steno.length} dictations`}
          dark
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Mini label="Typing words saved" value={typingWords} />
        <Mini label="Steno English words" value={englishWords} />
        <Mini label="Steno Hindi words" value={hindiWords} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[#E3E6EB] bg-white p-1">
          <TabButton on={tab === "typing"} onClick={() => setTab("typing")}>
            Typing
          </TabButton>
          <TabButton on={tab === "steno"} onClick={() => setTab("steno")}>
            Steno
          </TabButton>
        </div>
        <p className="text-sm text-[#4B5563]">
          Built in already: {stats.builtinTyping} passages · {stats.builtinSteno} dictations
        </p>
      </div>

      {tab === "typing" ? (
        <TypingPanel passages={passages} customExams={customExams} />
      ) : (
        <StenoPanel dictations={dictations} customDictations={customDictations} />
      )}
    </div>
  );
}

function TypingPanel({ passages, customExams }: { passages: SavedTypingPassage[]; customExams: NamedOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [examId, setExamId] = useState("dhc");
  const [language, setLanguage] = useState<(typeof passageLanguages)[number]>("English");
  const [minutes, setMinutes] = useState("10");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const words = countWords(text);
  const typedMinutes = Number(minutes);
  const targetWords =
    Number.isInteger(typedMinutes) && typedMinutes >= 1 && typedMinutes <= 60
      ? typedMinutes * typingWordsPerMinute
      : 0;
  const wordGap = targetWords - words;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (targetWords === 0 || words !== targetWords) {
      setError(
        targetWords
          ? `This passage needs ${targetWords} words for ${typedMinutes} minutes at ${typingWordsPerMinute} wpm.`
          : "Enter a time from 1 to 60 minutes.",
      );
      return;
    }
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, language, examId, minutes: Number(minutes), text }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "That passage could not be saved.");
        return;
      }
      setTitle("");
      setText("");
      router.refresh();
    } catch {
      setError("That passage could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-[#E3E6EB] bg-white p-6">
        <FormStep n="1" title="Details">
          <ChoiceField
            kind="exam"
            label="Exam body"
            value={examId}
            builtIn={examBodies.map(({ id, name }) => ({ id, name }))}
            custom={customExams}
            onChange={setExamId}
            placeholder="Add an exam body"
          />
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <FieldLabel>Title</FieldLabel>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={140} placeholder="Bail application under Section 483" className={fieldClass} />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <FieldLabel>Time</FieldLabel>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              step={1}
              required
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={fieldClass}
            />
            <span className="text-[13px] text-[#4B5563]">
              {targetWords ? `${targetWords} words at ${typingWordsPerMinute} per minute.` : "Minutes for this passage, from 1 to 60."}
            </span>
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <FieldLabel>Language</FieldLabel>
            <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className={fieldClass}>
              {passageLanguages.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </FormStep>
        <FormStep n="2" title="Passage">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <FieldLabel>Full text · {targetWords || "—"} words</FieldLabel>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              maxLength={100000}
              rows={12}
              placeholder={targetWords ? `Paste ${targetWords} words. The test runs at ${typingWordsPerMinute} words per minute.` : "Paste the passage exactly as the candidate should type it."}
              className={`${fieldClass} min-h-64 resize-y font-passage text-[15px] leading-7`}
            />
          </label>
        </FormStep>
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${words === targetWords && targetWords > 0 ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#F6F7F9] text-[#374151]"}`}>
          <span>{words} / {targetWords || "—"} words</span>
          <span>{text.length} characters</span>
          <span>
            {targetWords === 0
              ? `Counted at ${typingWordsPerMinute} wpm`
              : wordGap === 0
                ? `${typedMinutes} min at ${typingWordsPerMinute} wpm`
                : wordGap > 0
                  ? `${wordGap} more words needed`
                  : `${Math.abs(wordGap)} words over`}
          </span>
        </div>
        <button type="submit" disabled={busy} className="rounded-[10px] bg-[#C2410C] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save passage"}
        </button>
        {error ? <p className="text-sm text-[#C2410C]">{error}</p> : null}
      </form>
      <Library
        empty="No typing passages saved yet."
        items={passages.map((item) => ({
          id: item.id,
          title: item.title,
          meta: `${examBodyName(item.examId, customExams) || "Any exam"} · ${item.language ?? "English"} · ${item.minutes ? `${item.minutes} min · ` : ""}${countWords(item.text)} words`,
          when: item.createdAt,
          detail: item.text,
        }))}
        onRemove={(id) => removeItem("/api/admin/typing", id, router)}
      />
    </div>
  );
}

function StenoPanel({
  dictations,
  customDictations,
}: {
  dictations: SavedStenoDictation[];
  customDictations: NamedOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Legal");
  const [english, setEnglish] = useState("");
  const [hindi, setHindi] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const englishWords = countWords(english);
  const hindiWords = countWords(hindi);
  const gap = englishWords && hindiWords ? Math.abs(englishWords - hindiWords) / Math.max(englishWords, hindiWords) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/steno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topic, english, hindi }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "That dictation could not be saved.");
        return;
      }
      setTitle("");
      setEnglish("");
      setHindi("");
      router.refresh();
    } catch {
      setError("That dictation could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-[#E3E6EB] bg-white p-6">
        <FormStep n="1" title="Details">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <FieldLabel>Title</FieldLabel>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={140} placeholder="Legal matter" className={fieldClass} />
          </label>
          <ChoiceField
            kind="dictation"
            label="Dictation"
            value={topic}
            builtIn={stenoTopics.map((name) => ({ id: name, name }))}
            custom={customDictations}
            onChange={setTopic}
            placeholder="Add a dictation"
          />
        </FormStep>
        <FormStep n="2" title="Dictation">
          <label className="grid gap-1.5 text-sm">
            <FieldLabel>English · {englishWords} words</FieldLabel>
            <textarea
              value={english}
              onChange={(event) => setEnglish(event.target.value)}
              required
              minLength={20}
              maxLength={8000}
              rows={8}
              placeholder="The text that will be read aloud in English."
              className={`${fieldClass} min-h-48 resize-y leading-7`}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <FieldLabel>Hindi · optional · {hindiWords} words</FieldLabel>
            <textarea
              value={hindi}
              onChange={(event) => setHindi(event.target.value)}
              maxLength={8000}
              rows={8}
              placeholder="Leave this blank for an English-only dictation."
              className={`${fieldClass} min-h-48 resize-y leading-7`}
            />
          </label>
        </FormStep>
        {gap > 0.25 ? (
          <p className="rounded-xl bg-[#FFF7F2] px-4 py-3 text-sm text-[#9A3412]">
            The English and Hindi word counts are quite different. Check that they are the same dictation.
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="rounded-[10px] bg-[#C2410C] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save dictation"}
        </button>
        {error ? <p className="text-sm text-[#C2410C]">{error}</p> : null}
      </form>
      <Library
        empty="No steno dictations saved yet."
        items={dictations.map((item) => ({
          id: item.id,
          title: item.title,
          meta: `${item.topic ?? "General"} dictation · ${countWords(item.english)} English${countWords(item.hindi) ? ` · ${countWords(item.hindi)} Hindi` : ""}`,
          when: item.createdAt,
          detail: item.english,
        }))}
        onRemove={(id) => removeItem("/api/admin/steno", id, router)}
      />
    </div>
  );
}

function FormStep({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#111827] text-xs text-white">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="font-medium text-[#374151]">{children}</span>;
}

function ChoiceField({
  kind,
  label,
  value,
  builtIn,
  custom,
  onChange,
  placeholder,
}: {
  kind: "exam" | "dictation";
  label: string;
  value: string;
  builtIn: NamedOption[];
  custom: NamedOption[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [added, setAdded] = useState<NamedOption[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const extras = [...custom.filter((item) => !added.some((next) => next.id === item.id)), ...added];
  const options = [...builtIn, ...extras.filter((item) => !builtIn.some((built) => built.name.toLowerCase() === item.name.toLowerCase()))];
  const selected = kind === "exam" ? value : value;

  async function add() {
    const name = draft.trim();
    if (name.length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name }),
      });
      const body = (await response.json()) as { error?: string; option?: NamedOption };
      if (!response.ok || !body.option) {
        setError(body.error || "That option could not be saved.");
        return;
      }
      setAdded((current) => [...current, body.option as NamedOption]);
      onChange(kind === "exam" ? body.option.id : body.option.name);
      setDraft("");
      router.refresh();
    } catch {
      setError("That option could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: NamedOption) {
    setError("");
    try {
      const response = await fetch("/api/admin/options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: item.id }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error || "That option could not be removed.");
        return;
      }
      setAdded((current) => current.filter((option) => option.id !== item.id));
      if (selected === item.id || selected === item.name) onChange(builtIn[0]?.id ?? "");
      router.refresh();
    } catch {
      setError("That option could not be removed.");
    }
  }

  return (
    <div className="grid gap-2 text-sm sm:col-span-2">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={options.some((item) => (kind === "exam" ? item.id : item.name) === selected) ? selected : builtIn[0]?.id ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map((item) => (
          <option key={item.id} value={kind === "exam" ? item.id : item.name}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          maxLength={60}
          placeholder={placeholder}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || draft.trim().length < 2}
          className="shrink-0 rounded-xl border border-[#D1D5DB] px-4 font-semibold text-[#111827] disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {extras.length ? (
        <ul className="flex flex-wrap gap-2">
          {extras.map((item) => (
            <li key={item.id} className="inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] px-3 py-1 text-[13px] text-[#374151]">
              {item.name}
              <button type="button" onClick={() => void remove(item)} className="font-semibold text-[#C2410C]">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-[#C2410C]">{error}</p> : null}
    </div>
  );
}

function Stat({ label, value, note, dark }: { label: string; value: number; note: string; dark?: boolean }) {
  return (
    <article className={dark ? "rounded-2xl bg-[#111827] px-5 py-4 text-white" : "rounded-2xl border border-[#E3E6EB] bg-white px-5 py-4"}>
      <p className={dark ? "text-[13px] font-semibold tracking-[0.06em] text-[#D1D5DB] uppercase" : "text-[13px] font-semibold tracking-[0.06em] text-[#4B5563] uppercase"}>{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
      <p className={dark ? "mt-1 text-sm text-[#D1D5DB]" : "mt-1 text-sm text-[#4B5563]"}>{note}</p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E6EB] bg-white px-4 py-3">
      <span className="text-sm text-[#4B5563]">{label}</span>
      <span className="font-display text-xl font-bold">{value}</span>
    </div>
  );
}

function TabButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={on ? "rounded-full bg-[#C2410C] px-4 py-2 text-sm font-semibold text-white" : "rounded-full px-4 py-2 text-sm font-semibold text-[#374151]"}
    >
      {children}
    </button>
  );
}

function Library({
  items,
  empty,
  onRemove,
}: {
  items: { id: string; title: string; meta: string; when: string; detail: string }[];
  empty: string;
  onRemove: (id: string) => Promise<string | null>;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-[#E3E6EB] bg-white p-5">
      <h2 className="font-display text-xl font-bold">Saved</h2>
      {items.length === 0 ? <p className="text-sm text-[#4B5563]">{empty}</p> : null}
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[#E3E6EB] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-[13px] text-[#4B5563]">{item.meta}</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">{formatWhen(item.when)}</p>
              </div>
              <button
                type="button"
                disabled={pending === item.id}
                onClick={() => {
                  setPending(item.id);
                  setError("");
                  void onRemove(item.id).then((message) => {
                    setPending("");
                    if (message) setError(message);
                  });
                }}
                className="shrink-0 rounded-lg border border-[#D1D5DB] px-3 py-1.5 text-sm font-semibold text-[#374151] disabled:opacity-60"
              >
                Remove
              </button>
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#4B5563]">{item.detail}</p>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-[#C2410C]">{error}</p> : null}
    </aside>
  );
}

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function removeItem(url: string, id: string, router: { refresh: () => void }) {
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) return body.error || "That item could not be removed.";
    router.refresh();
    return null;
  } catch {
    return "That item could not be removed.";
  }
}
