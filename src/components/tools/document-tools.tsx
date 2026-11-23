"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppSelect } from "@/components/app-select";
import {
  cropSignature,
  drawCover,
  jpegWithinLimit,
  loadImage,
  plainBackground,
} from "@/lib/image-tools";
import { compressPdf, mergeDocuments, pdfPagesToImages } from "@/lib/pdf-tools";

type Tool = { name: string; detail: string; href?: string };

const photoPresets = [
  { id: "ssc", label: "SSC style", width: 200, height: 230, maxKb: 50 },
  { id: "passport", label: "Passport style", width: 413, height: 531, maxKb: 200 },
  { id: "small", label: "Small form", width: 100, height: 120, maxKb: 20 },
  { id: "custom", label: "Custom", width: 350, height: 450, maxKb: 100 },
];

const signaturePresets = [
  { id: "box", label: "Form box", width: 140, height: 60 },
  { id: "wide", label: "Wide box", width: 300, height: 100 },
  { id: "custom", label: "Custom", width: 200, height: 80 },
];

const backgroundColors = [
  { id: "white", label: "White", color: [255, 255, 255] as [number, number, number] },
  { id: "blue", label: "Light blue", color: [214, 228, 240] as [number, number, number] },
];

const compressLevels = [
  { id: "smaller", label: "Smaller file", scale: 1, quality: 0.52 },
  { id: "balanced", label: "Balanced", scale: 1.35, quality: 0.72 },
  { id: "clearer", label: "Clearer", scale: 1.8, quality: 0.86 },
];

const toolIcons = {
  "Form photo resizer": PhotoIcon,
  "Signature crop": SignatureIcon,
  "Plain background": BackgroundIcon,
  "PDF compress": CompressIcon,
  "Merge documents": MergeIcon,
  "Page to image": PageIcon,
  "Typing test": TypingIcon,
} as const;

export function DocumentTools({ tools }: { tools: Tool[] }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const open = tools.find((tool) => tool.name === openName) ?? null;
  const Icon = open ? toolIcons[open.name as keyof typeof toolIcons] : null;

  return (
    <div className="grid gap-6">
      <p className="rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-3 text-sm leading-6 text-[#52606d]">
        Photos and PDFs stay on this device. A signed-in typing test is saved on your account.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const ToolIcon = toolIcons[tool.name as keyof typeof toolIcons];
          return (
            <li key={tool.name}>
              {tool.href ? (
                <Link
                  href={tool.href}
                  className="flex h-full w-full flex-col items-start gap-4 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 text-left transition-colors hover:border-[#8aa4bc]"
                >
                  <ToolCardBody name={tool.name} detail={tool.detail} icon={ToolIcon} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenName(tool.name)}
                  className="flex h-full w-full flex-col items-start gap-4 rounded-2xl border border-[#d5dee6] bg-[#ffffff] px-4 py-4 text-left transition-colors hover:border-[#8aa4bc]"
                >
                  <ToolCardBody name={tool.name} detail={tool.detail} icon={ToolIcon} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {open && Icon ? (
        <ToolDialog
          title={open.name}
          detail={open.detail}
          icon={<Icon />}
          onClose={() => setOpenName(null)}
        >
          {open.name === "Form photo resizer" ? <PhotoResizer /> : null}
          {open.name === "Signature crop" ? <SignatureCrop /> : null}
          {open.name === "Plain background" ? <PlainBackground /> : null}
          {open.name === "PDF compress" ? <PdfCompress /> : null}
          {open.name === "Merge documents" ? <MergeDocuments /> : null}
          {open.name === "Page to image" ? <PageToImage /> : null}
        </ToolDialog>
      ) : null}
    </div>
  );
}

function ToolCardBody({
  name,
  detail,
  icon: Icon,
}: {
  name: string;
  detail: string;
  icon?: () => React.ReactNode;
}) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f5f7] text-[#1d4e89]">
        {Icon ? <Icon /> : null}
      </span>
      <span>
        <span className="block font-medium">{name}</span>
        <span className="mt-1 block text-sm leading-6 text-[#52606d]">{detail}</span>
      </span>
    </>
  );
}

function ToolDialog({
  title,
  detail,
  icon,
  onClose,
  children,
}: {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }
    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border border-[#d5dee6] bg-[#ffffff] p-0 text-[#1c2834] shadow-xl backdrop:bg-[#1c2834]/50"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-start gap-3 border-b border-[#e6edf2] px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3f5f7] text-[#1d4e89]">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-medium">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#52606d]">{detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[#c5d0d8] px-3 py-1.5 text-sm font-medium"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}

function ToolFields({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[#52606d]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#d5dee6] bg-white px-3 py-2.5 text-sm text-[#1c2834]";

function RunButton({
  children,
  busy,
  disabled,
}: {
  children: React.ReactNode;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="inline-flex h-10 items-center justify-center rounded-full bg-[#1c2834] px-4 text-sm font-medium text-[#f4f7f9] disabled:opacity-50"
    >
      {busy ? "Working…" : children}
    </button>
  );
}

function ResultNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-[#52606d]">{children}</p>;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-[#1d4e89]">{children}</p>;
}

function DownloadLink({ href, filename, children }: { href: string; filename: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      download={filename}
      className="text-sm font-medium text-[#1d4e89] underline underline-offset-4"
    >
      {children}
    </a>
  );
}

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PhotoResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [presetId, setPresetId] = useState(photoPresets[0].id);
  const preset = photoPresets.find((item) => item.id === presetId) ?? photoPresets[0];
  const [width, setWidth] = useState(preset.width);
  const [height, setHeight] = useState(preset.height);
  const [maxKb, setMaxKb] = useState(preset.maxKb);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [savedSize, setSavedSize] = useState("");
  const preview = useObjectUrl(result);

  return (
    <ToolFields>
      <Field label="Photo">
        <input
          className={inputClass}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError("");
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Size">
          <AppSelect
            value={presetId}
            options={photoPresets.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => {
              const next = photoPresets.find((item) => item.id === value);
              setPresetId(value);
              if (next) {
                setWidth(next.width);
                setHeight(next.height);
                setMaxKb(next.maxKb);
              }
            }}
          />
        </Field>
        <Field label="Width">
          <input
            className={inputClass}
            type="number"
            min={50}
            max={2000}
            value={width}
            onChange={(event) => {
              setPresetId("custom");
              setWidth(Number(event.target.value));
            }}
          />
        </Field>
        <Field label="Height">
          <input
            className={inputClass}
            type="number"
            min={50}
            max={2000}
            value={height}
            onChange={(event) => {
              setPresetId("custom");
              setHeight(Number(event.target.value));
            }}
          />
        </Field>
        <Field label="Max KB">
          <input
            className={inputClass}
            type="number"
            min={5}
            max={2000}
            value={maxKb}
            onChange={(event) => setMaxKb(Number(event.target.value))}
          />
        </Field>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) {
            setError("Choose a photo first.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            const image = await loadImage(file);
            const canvas = drawCover(
              image,
              image.naturalWidth,
              image.naturalHeight,
              Math.round(width),
              Math.round(height),
            );
            const saved = await jpegWithinLimit(canvas, Math.round(maxKb) * 1024);
            setResult(saved.blob);
            setSavedSize(`${saved.width}×${saved.height} px, ${formatBytes(saved.blob.size)}`);
          } catch (cause) {
            setResult(null);
            setError(cause instanceof Error ? cause.message : "Could not resize the photo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy}>Resize photo</RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {preview ? (
        <div className="grid gap-2">
          <img
            src={preview}
            alt="Resized form photo"
            loading="lazy"
            decoding="async"
            className="max-h-64 w-auto rounded-md border border-[#d5dee6] bg-white"
          />
          <ResultNote>{savedSize}</ResultNote>
          <DownloadLink href={preview} filename="form-photo.jpg">
            Download JPG
          </DownloadLink>
        </div>
      ) : null}
    </ToolFields>
  );
}

function SignatureCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [presetId, setPresetId] = useState(signaturePresets[0].id);
  const preset = signaturePresets.find((item) => item.id === presetId) ?? signaturePresets[0];
  const [width, setWidth] = useState(preset.width);
  const [height, setHeight] = useState(preset.height);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const preview = useObjectUrl(result);

  return (
    <ToolFields>
      <Field label="Signature scan">
        <input
          className={inputClass}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError("");
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Box">
          <AppSelect
            value={presetId}
            options={signaturePresets.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => {
              const next = signaturePresets.find((item) => item.id === value);
              setPresetId(value);
              if (next) {
                setWidth(next.width);
                setHeight(next.height);
              }
            }}
          />
        </Field>
        <Field label="Width">
          <input
            className={inputClass}
            type="number"
            min={40}
            max={1200}
            value={width}
            onChange={(event) => {
              setPresetId("custom");
              setWidth(Number(event.target.value));
            }}
          />
        </Field>
        <Field label="Height">
          <input
            className={inputClass}
            type="number"
            min={20}
            max={600}
            value={height}
            onChange={(event) => {
              setPresetId("custom");
              setHeight(Number(event.target.value));
            }}
          />
        </Field>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) {
            setError("Choose a signature scan first.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            setResult(await cropSignature(file, Math.round(width), Math.round(height)));
          } catch (cause) {
            setResult(null);
            setError(cause instanceof Error ? cause.message : "Could not crop the signature.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy}>Crop signature</RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {preview ? (
        <div className="grid gap-2">
          <img
            src={preview}
            alt="Cropped signature"
            loading="lazy"
            decoding="async"
            className="max-w-full rounded-md border border-[#d5dee6] bg-white"
          />
          <DownloadLink href={preview} filename="signature.png">
            Download PNG
          </DownloadLink>
        </div>
      ) : null}
    </ToolFields>
  );
}

function PlainBackground() {
  const [file, setFile] = useState<File | null>(null);
  const [colorId, setColorId] = useState(backgroundColors[0].id);
  const [tolerance, setTolerance] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const preview = useObjectUrl(result);
  const color = backgroundColors.find((item) => item.id === colorId) ?? backgroundColors[0];

  return (
    <ToolFields>
      <p className="text-sm leading-6 text-[#52606d]">
        Works when the backdrop is a fairly even colour and touches the edges of the photo.
      </p>
      <Field label="Photo">
        <input
          className={inputClass}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError("");
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Replacement">
          <AppSelect
            value={colorId}
            options={backgroundColors.map((item) => ({ value: item.id, label: item.label }))}
            onChange={setColorId}
          />
        </Field>
        <Field label={`Edge match ${tolerance}`}>
          <input
            className="w-full"
            type="range"
            min={30}
            max={180}
            value={tolerance}
            onChange={(event) => setTolerance(Number(event.target.value))}
          />
        </Field>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) {
            setError("Choose a photo first.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            setResult(await plainBackground(file, color.color, tolerance));
          } catch (cause) {
            setResult(null);
            setError(cause instanceof Error ? cause.message : "Could not replace the background.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy}>Replace background</RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {preview ? (
        <div className="grid gap-2">
          <img
            src={preview}
            alt="Photo with a plain background"
            loading="lazy"
            decoding="async"
            className="max-h-72 w-auto rounded-md border border-[#d5dee6] bg-white"
          />
          <DownloadLink href={preview} filename="plain-background.jpg">
            Download JPG
          </DownloadLink>
        </div>
      ) : null}
    </ToolFields>
  );
}

function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [levelId, setLevelId] = useState(compressLevels[1].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const href = useObjectUrl(result);

  return (
    <ToolFields>
      <Field label="PDF">
        <input
          className={inputClass}
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError("");
          }}
        />
      </Field>
      <Field label="Result">
        <AppSelect
          value={levelId}
          options={compressLevels.map((item) => ({ value: item.id, label: item.label }))}
          onChange={setLevelId}
        />
      </Field>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) {
            setError("Choose a PDF first.");
            return;
          }
          const level = compressLevels.find((item) => item.id === levelId) ?? compressLevels[1];
          setBusy(true);
          setError("");
          try {
            const blob = await compressPdf(file, level.scale, level.quality);
            setResult(blob);
            setNote(`${formatBytes(file.size)} became ${formatBytes(blob.size)}.`);
          } catch (cause) {
            setResult(null);
            setError(cause instanceof Error ? cause.message : "Could not compress that PDF.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy}>Compress PDF</RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {href ? (
        <div className="grid gap-2">
          <ResultNote>{note}</ResultNote>
          <DownloadLink href={href} filename="compressed.pdf">
            Download PDF
          </DownloadLink>
        </div>
      ) : null}
    </ToolFields>
  );
}

function MergeDocuments() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const href = useObjectUrl(result);

  return (
    <ToolFields>
      <Field label="PDFs or images">
        <input
          className={inputClass}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            setFiles(Array.from(event.target.files ?? []));
            setResult(null);
            setError("");
          }}
        />
      </Field>
      {files.length > 0 ? (
        <ol className="grid gap-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="text-[#1d4e89] underline-offset-4 hover:underline disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => moveFile(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="text-[#1d4e89] underline-offset-4 hover:underline disabled:opacity-40"
                  disabled={index === files.length - 1}
                  onClick={() => moveFile(index, 1)}
                >
                  Down
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            setResult(await mergeDocuments(files));
          } catch (cause) {
            setResult(null);
            setError(cause instanceof Error ? cause.message : "Could not merge those files.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy} disabled={files.length < 2}>
          Merge into one PDF
        </RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {href ? (
        <DownloadLink href={href} filename="merged.pdf">
          Download PDF
        </DownloadLink>
      ) : null}
    </ToolFields>
  );

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return current;
      }
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    setResult(null);
  }
}

function PageToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState<Blob[]>([]);

  return (
    <ToolFields>
      <Field label="PDF">
        <input
          className={inputClass}
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPages([]);
            setError("");
          }}
        />
      </Field>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) {
            setError("Choose a PDF first.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            setPages(await pdfPagesToImages(file));
          } catch (cause) {
            setPages([]);
            setError(cause instanceof Error ? cause.message : "Could not turn that PDF into images.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RunButton busy={busy}>Make JPG pages</RunButton>
      </form>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {pages.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pages.map((page, index) => (
            <PagePreview key={`${page.size}-${index}`} page={page} index={index} />
          ))}
        </ul>
      ) : null}
    </ToolFields>
  );
}

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function PhotoIcon() {
  return (
    <IconFrame>
      <rect x="9" y="4" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 19.5c1.2-2 2.4-3 4-3s2.8 1 4 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 25h6M21 25h6M8 22v6M24 22v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconFrame>
  );
}

function SignatureIcon() {
  return (
    <IconFrame>
      <path d="M5 6h6M21 6h6M8 3v6M24 3v6M5 26h6M21 26h6M8 23v6M24 23v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 18c2.5-6 4-6 5.5 0S16.5 22 19 14c1.2-4 2.4-4 4.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

function BackgroundIcon() {
  return (
    <IconFrame>
      <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20l6-5 4 3 5-6 9 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="2" fill="currentColor" />
    </IconFrame>
  );
}

function CompressIcon() {
  return (
    <IconFrame>
      <path d="M12 4h6l6 6v16a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 4v6h6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 14l4 2-4 2M25 14l-4 2 4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </IconFrame>
  );
}

function MergeIcon() {
  return (
    <IconFrame>
      <rect x="4" y="7" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="16" y="10" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 18h6M19 15v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

function TypingIcon() {
  return (
    <IconFrame>
      <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 13h2M13 13h2M18 13h2M22 13h2M8 17h2M12 17h8M22 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </IconFrame>
  );
}

function PageIcon() {
  return (
    <IconFrame>
      <path d="M8 4h8l7 7v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 4v7h7" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="16" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 22l3-3 2 2 2-2 5 3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </IconFrame>
  );
}

function PagePreview({ page, index }: { page: Blob; index: number }) {
  const href = useObjectUrl(page);
  if (!href) {
    return null;
  }
  return (
    <li className="grid gap-2">
      <img
        src={href}
        alt={`Scanned page ${index + 1} converted to a JPG`}
        loading="lazy"
        decoding="async"
        className="max-h-72 w-full rounded-md border border-[#d5dee6] bg-white object-contain"
      />
      <DownloadLink href={href} filename={`page-${index + 1}.jpg`}>
        Download page {index + 1}
      </DownloadLink>
    </li>
  );
}
