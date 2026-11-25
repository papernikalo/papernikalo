"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import type { PublicUser } from "@/lib/auth-config";

const fieldClass =
  "w-full rounded-xl border border-[#E3E6EB] bg-white px-3 py-2.5 text-sm text-[#111827]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[#4B5563]">{label}</span>
      {children}
    </label>
  );
}

export function SignUpForm({
  onSignedIn,
  onSignIn,
}: {
  onSignedIn?: () => void;
  onSignIn?: () => void;
} = {}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, password, confirmPassword, email, mobile }),
      });
      const body = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !body.user) {
        setError(body.error || "The account could not be created.");
        return;
      }
      setUser(body.user);
      if (onSignedIn) onSignedIn();
      else router.push("/account");
    } catch {
      setError("The account could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={
        onSignedIn
          ? "grid w-full gap-4"
          : "grid w-full gap-4 rounded-2xl border border-[#E3E6EB] bg-[#ffffff] p-4 sm:p-6"
      }
      onSubmit={submit}
    >
      <Field label="Name">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className={fieldClass}
        />
      </Field>
      <Field label="User id">
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          className={fieldClass}
        />
      </Field>
      <Field label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className={fieldClass}
        />
      </Field>
      <Field label="Confirm password">
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className={fieldClass}
        />
      </Field>
      <Field label="Email">
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
      </Field>
      <Field label="Mobile number">
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
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-[10px] bg-[#C2410C] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9A3412] disabled:cursor-default disabled:opacity-60"
      >
        {busy ? "Creating account…" : "Create account"}
      </button>
      {error ? (
        <p className="text-sm text-[#C2410C]" role="status">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-[#4B5563]">
        Already registered?{" "}
        {onSignIn ? (
          <button type="button" onClick={onSignIn} className="underline underline-offset-4">
            Sign in
          </button>
        ) : (
          <Link href="/sign-in" className="underline underline-offset-4">
            Sign in
          </Link>
        )}
      </p>
    </form>
  );
}

export function SignInForm({
  onSignedIn,
  onCreateAccount,
}: {
  onSignedIn?: () => void;
  onCreateAccount?: () => void;
} = {}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const body = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !body.user) {
        setError(body.error || "Sign-in failed.");
        return;
      }
      setUser(body.user);
      if (onSignedIn) onSignedIn();
      else router.push("/");
    } catch {
      setError("Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={
        onSignedIn
          ? "grid w-full gap-4"
          : "grid w-full gap-4 rounded-2xl border border-[#E3E6EB] bg-[#ffffff] p-4 sm:p-6"
      }
      onSubmit={submit}
    >
      <Field label="User id">
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          className={fieldClass}
        />
      </Field>
      <Field label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          required
          maxLength={72}
          className={fieldClass}
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-[10px] bg-[#C2410C] px-4 py-3 text-sm font-semibold text-white hover:bg-[#9A3412] disabled:cursor-default disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error ? (
        <p className="text-sm text-[#C2410C]" role="status">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-[#4B5563]">
        New here?{" "}
        {onCreateAccount ? (
          <button type="button" onClick={onCreateAccount} className="underline underline-offset-4">
            Create an account
          </button>
        ) : (
          <Link href="/signup" className="underline underline-offset-4">
            Sign up
          </Link>
        )}
      </p>
    </form>
  );
}
