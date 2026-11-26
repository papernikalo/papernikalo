"use client";

import { useEffect, useState } from "react";
import { SignInForm, SignUpForm } from "@/components/auth-forms";

export function SignInModal({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");

  useEffect(() => {
    if (open) setMode("in");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#111827]/45 px-4 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="sign-in-modal-title" className="font-display text-2xl font-bold text-[#111827]">
              {mode === "in" ? "Sign in to submit" : "Create an account"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">
              Sign in to submit this test and save it on your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#4B5563]"
          >
            Close
          </button>
        </div>
        {mode === "in" ? (
          <SignInForm onSignedIn={onSignedIn} onCreateAccount={() => setMode("up")} />
        ) : (
          <SignUpForm onSignedIn={onSignedIn} onSignIn={() => setMode("in")} />
        )}
      </div>
    </div>
  );
}

export function ConfirmStartDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/45 px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-start-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-start-title" className="font-display text-2xl font-bold text-[#111827]">
          {title}
        </h2>
        <div className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">{body}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-[#D1D5DB] bg-white px-[22px] py-3.5 font-semibold text-[#111827]"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
