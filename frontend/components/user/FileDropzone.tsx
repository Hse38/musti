"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList | File[]) => void;
  icon?: string;
};

export function FileDropzone({
  label,
  hint,
  accept,
  multiple,
  onFiles,
  icon = "📎",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <p className="text-base font-medium text-slate-800 dark:text-slate-100 mb-2">
        {label}
      </p>
      <button
        type="button"
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          "w-full min-h-[48px] rounded-xl border-2 border-dashed px-4 py-4 text-left transition",
          drag
            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
            : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/50",
        ].join(" ")}
      >
        <span className="text-2xl mr-2" aria-hidden>
          {icon}
        </span>
        <span className="text-base text-slate-700 dark:text-slate-200">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
