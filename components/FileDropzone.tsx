"use client";

import { DragEvent, useRef, useState } from "react";

type FileDropzoneProps = {
  label: string;
  description?: string;
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  previewUrl?: string;
  compact?: boolean;
  variant?: "default" | "large";
  actionLabel?: string;
};

function acceptsFile(file: File, accept: string) {
  const accepted = accept
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const fileName = file.name.toLowerCase();

  return accepted.some((rule) => {
    if (rule.startsWith(".")) {
      return fileName.endsWith(rule);
    }

    if (rule.endsWith("/*")) {
      return file.type.startsWith(rule.replace("/*", "/"));
    }

    return file.type === rule;
  });
}

export function FileDropzone({
  label,
  description,
  accept,
  onFile,
  disabled,
  previewUrl,
  compact,
  variant = "default",
  actionLabel
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file?: File) {
    setError("");

    if (!file) {
      return;
    }

    if (!acceptsFile(file, accept)) {
      setError("That file type is not supported here.");
      return;
    }

    onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  if (variant === "large") {
    return (
      <div className="grid gap-4">
        <div
          className={`group grid min-h-56 place-items-center rounded-xl border border-dashed p-6 text-center transition ${
            isDragging
              ? "border-accent bg-teal-400/10"
              : "border-slate-700 bg-slate-950 hover:border-accent hover:bg-slate-900/60"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          onClick={() => {
            if (!disabled) {
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={accept}
            disabled={disabled}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <div className="grid justify-items-center gap-5">
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-accent bg-teal-400/10 text-2xl text-accent">
              +
            </div>
            <div>
              <p className="text-base font-medium text-slate-300">{label}</p>
              {description ? <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="mx-auto rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-100 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {actionLabel ?? "Choose File"}
        </button>
        {error ? <p className="text-center text-xs text-amber-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div
        className={`group rounded-xl border border-dashed p-4 transition ${
          isDragging
            ? "border-accent bg-teal-400/10"
            : "border-slate-700 bg-slate-900/70 hover:border-accent hover:bg-slate-900"
        } ${compact ? "min-h-20" : "min-h-32"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // User-provided logo/hero previews are local data URLs or local paths.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-14 w-20 rounded-lg border border-slate-700 bg-slate-950 object-cover"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-accent bg-teal-400/10 text-lg text-accent">
              +
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-100">{label}</p>
            {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
            <p className="mt-1 text-xs text-slate-500">Drag and drop, or click to browse.</p>
          </div>
        </div>
      </div>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}
