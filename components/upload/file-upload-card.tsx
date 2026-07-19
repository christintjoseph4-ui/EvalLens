"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, RefreshCw, UploadCloud, X } from "lucide-react";
import { bytesToMegabytes } from "@/lib/document-processing";

export type FileUploadCardProps = {
  id: string;
  label: string;
  helper: string;
  required: boolean;
  file: File | null;
  previewUrl: string | null;
  error: string;
  accept: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
};

function fileKind(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "PDF document";
  }

  if (file.type.startsWith("image/")) {
    return file.type.replace("image/", "").toUpperCase();
  }

  return file.type || "Document";
}

export function FileUploadCard({
  id,
  label,
  helper,
  required,
  file,
  previewUrl,
  error,
  accept,
  onSelect,
  onRemove
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputId = `${id}-input`;
  const isPdf = file ? fileKind(file) === "PDF document" : false;

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    onSelect(files?.[0] ?? null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div
      className={`focus-within:ring-2 focus-within:ring-[#6d73d9]/35 rounded-[28px] border premium-hairline bg-white/70 p-6 transition ${
        required ? "md:min-h-64" : "md:min-h-44"
      } ${isDragging ? "bg-white ring-2 ring-[#6d73d9]/25" : "hover:bg-white/90"}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <label className="text-base font-medium" htmlFor={inputId}>
            {label}
          </label>
          <p className="mt-3 text-sm leading-6 text-[#666d78]">{helper}</p>
        </div>
        {required ? <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-[#6d73d9]">Needed</span> : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept={accept}
        aria-label={label}
        onChange={(event) => handleFiles(event.target.files)}
      />

      {file ? (
        <div className="mt-6 rounded-[26px] border premium-hairline bg-[#f8f9fc] p-4">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border premium-hairline bg-white">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Preview of ${file.name}`}
                  className="h-full w-full object-cover"
                  src={previewUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#eef1f6] text-[#102a56]">
                  <FileText size={24} aria-hidden />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#4f9f79]" size={16} aria-hidden />
                <p className="truncate text-sm font-medium text-[#2b3340]" title={file.name}>
                  {file.name}
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#666d78]">
                {fileKind(file)} - {bytesToMegabytes(file.size)} MB
              </p>
              {isPdf ? <p className="mt-1 text-xs leading-5 text-[#7b8391]">Page count is checked during analysis.</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border premium-hairline bg-white px-3 py-1.5 text-xs font-medium text-[#102a56] transition hover:bg-white/90"
                  type="button"
                  onClick={openPicker}
                  aria-label={`Replace ${label}`}
                >
                  <RefreshCw size={13} aria-hidden />
                  Replace
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border premium-hairline bg-white px-3 py-1.5 text-xs font-medium text-[#7a4e43] transition hover:bg-white/90"
                  type="button"
                  onClick={onRemove}
                  aria-label={`Remove ${label}`}
                >
                  <X size={13} aria-hidden />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          className={`focus-ring mt-6 flex w-full flex-col items-center justify-center rounded-[26px] border border-dashed border-[#ccd3df] bg-[#f8f9fc] px-4 py-6 text-center transition ${
            required ? "min-h-32" : "min-h-20"
          } ${isDragging ? "border-[#6d73d9] bg-white" : "hover:bg-white"}`}
          type="button"
          onClick={openPicker}
        >
          <UploadCloud size={22} className="text-[#102a56]" aria-hidden />
          <span className="mt-3 text-sm text-[#2b3340]">Choose a file</span>
          <span className="mt-1 text-xs text-[#7b8391]">or drag it here</span>
        </button>
      )}

      {error ? <p className="mt-3 text-sm leading-6 text-[#7a4e43]">{error}</p> : null}
    </div>
  );
}
