"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import type { PublicUser } from "@/lib/auth-config";

const fieldClass =
  "w-full rounded-xl border border-[#d5dee6] bg-white px-3 py-2.5 text-sm text-[#1c2834]";

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
    <form className="mx-auto grid w-full max-w-md gap-4" onSubmit={save}>
      <div className="grid gap-4 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[#1d4e89] bg-[#ffffff] text-lg font-semibold text-[#1d4e89]">
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : letter}
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-[#52606d]">
              Profile picture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-sm text-[#1c2834] file:mr-3 file:rounded-full file:border file:border-[#1d4e89] file:bg-[#ffffff] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1d4e89]"
                onChange={(event) => void choosePhoto(event.target.files?.[0])}
              />
            </label>
            {photo ? (
              <button
                type="button"
                className="w-fit text-sm text-[#1d4e89] underline underline-offset-4"
                onClick={() => setPhoto("")}
              >
                Remove picture
              </button>
            ) : null}
          </div>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-[#52606d]">Name</span>
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
        <div className="grid gap-1 text-sm">
          <span className="text-[#52606d]">User id</span>
          <p className="px-3 py-2.5">{user.userId}</p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-[#52606d]">Email</span>
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
        <label className="grid gap-1 text-sm">
          <span className="text-[#52606d]">Mobile number</span>
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
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-[#1c2834] px-4 py-2.5 text-sm font-medium text-[#f3f5f7] disabled:cursor-default disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {notice ? (
        <p className="text-sm text-[#1d4e89]" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[#1d4e89]" role="status">
          {error}
        </p>
      ) : null}
      <p className="text-sm leading-6 text-[#52606d]">
        The user id stays as it was when you signed up. You stay signed in on this browser.
      </p>
    </form>
  );
}

export function AccountPanel() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <p className="mx-auto max-w-md text-center text-[#52606d]">Checking your sign-in…</p>;
  }

  if (!user) {
    return (
      <p className="mx-auto max-w-md text-center">
        Sign in to see these details.{" "}
        <Link href="/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/signup" className="underline underline-offset-4">
          create an account
        </Link>
        .
      </p>
    );
  }

  return <AccountEditor key={user.userId} user={user} />;
}
