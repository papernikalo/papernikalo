"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AccountServices } from "@/components/services-board";
import { useAuth } from "@/components/auth-provider";
import type { PublicUser } from "@/lib/auth-config";

const fieldClass =
  "w-full rounded-[10px] border border-[#D1D5DB] bg-white px-3 py-3 text-[15px] text-[#111827] focus:border-[#C2410C] focus:outline-none";

async function squarePhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The picture could not be prepared.");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function AccountEditor({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile);
  const [photo, setPhoto] = useState(user.photo);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const letter = (name.trim() || user.userId).charAt(0).toUpperCase();

  async function choosePhoto(file: File | undefined) {
    setNotice("");
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP picture.");
      return;
    }
    try {
      setPhoto(await squarePhoto(file));
    } catch {
      setError("Choose a JPEG, PNG, or WebP picture.");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setNotice("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, photo }),
      });
      const body = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !body.user) {
        setError(body.error || "The account could not be saved.");
        return;
      }
      setUser(body.user);
      setName(body.user.name);
      setEmail(body.user.email);
      setMobile(body.user.mobile);
      setPhoto(body.user.photo);
      setNotice("Saved.");
    } catch {
      setError("The account could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={save}>
      <section className="rounded-2xl border border-[#E3E6EB] bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void choosePhoto(event.target.files?.[0])}
            />
            <button
              type="button"
              aria-label={photo ? "Change picture" : "Add picture"}
              onClick={() => fileRef.current?.click()}
              className="group relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-[#C2410C] bg-[#FFF7F2] text-2xl font-semibold text-[#C2410C]"
            >
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : letter}
              <span className="absolute inset-x-0 bottom-0 bg-[#C2410C]/90 py-1 text-[11px] font-semibold text-white">
                {photo ? "Change" : "Add"}
              </span>
            </button>
            {photo ? (
              <button
                type="button"
                aria-label="Remove picture"
                onClick={() => setPhoto("")}
                className="absolute -top-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-[#E3E6EB] bg-white text-sm leading-none font-semibold text-[#B91C1C] shadow-sm hover:border-[#B91C1C]"
              >
                ×
              </button>
            ) : null}
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[#111827]">{name.trim() || user.userId}</p>
            <p className="text-sm text-[#4B5563]">{user.userId}</p>
          </div>
        </div>
        <div className="mt-6">
          <AccountServices />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            User id
            <input value={user.userId} readOnly className={`${fieldClass} bg-[#F6F7F9] text-[#4B5563]`} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={120}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Mobile number
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              maxLength={14}
              className={fieldClass}
            />
          </label>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#4B5563]">The user id stays as it was when you signed up.</p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2410C] px-[22px] py-3 text-sm font-semibold text-white hover:bg-[#9A3412] disabled:cursor-default disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {notice ? (
        <p className="text-sm font-medium text-[#166534]" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-[#B91C1C]" role="status">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function AccountPanel() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <p className="mx-auto max-w-md text-center text-[#4B5563]">Checking your sign-in…</p>;
  }

  if (!user) {
    return (
      <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-[#E3E6EB] bg-white p-6">
        <p className="text-[15px] leading-relaxed text-[#4B5563]">Sign in to see these details.</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-[10px] border border-[#D1D5DB] bg-white px-[18px] font-semibold text-[#111827]"
          >
            Create an account
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2410C] px-[18px] font-semibold text-white hover:bg-[#9A3412]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return <AccountEditor key={user.userId} user={user} />;
}
