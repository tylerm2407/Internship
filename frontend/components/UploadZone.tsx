"use client";

import { useCallback, useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) return;
      if (file.size > 10 * 1024 * 1024) return;
      onFileSelected(file);
    },
    [onFileSelected, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        bg-surface rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200 ease-institutional
        border-2 border-dashed
        ${
          dragOver
            ? "border-accent bg-surface-hover"
            : "border-surface-border hover:border-accent hover:bg-surface-hover"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <UploadSimple
        size={48}
        weight="regular"
        className="mx-auto text-ink-secondary mb-4"
      />
      <p className="text-base text-ink-primary font-medium">
        Drop your resume here or click to browse
      </p>
      <p className="text-sm text-ink-secondary mt-1">PDF only, max 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        aria-label="Upload resume PDF"
      />
    </div>
  );
}
