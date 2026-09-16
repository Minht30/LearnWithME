"use client";

import * as React from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";

type Props = {
  onFile: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

/**
 * Two-button picker: "Choose from library" (no capture attribute so the OS
 * shows the gallery) and "Use camera" (with capture="environment").
 * Fixes the mobile issue where capture forced the camera on Android.
 */
export function ImagePicker({ onFile, uploading, disabled, compact }: Props) {
  const libRef = React.useRef<HTMLInputElement>(null);
  const camRef = React.useRef<HTMLInputElement>(null);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  }

  const btnBase =
    "inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-[var(--brand)]/40 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--brand)] hover:border-[var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handle}
      />
      <button
        type="button"
        onClick={() => libRef.current?.click()}
        disabled={uploading || disabled}
        className={btnBase}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" /> Choose from library
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => camRef.current?.click()}
        disabled={uploading || disabled}
        className={btnBase}
      >
        <Camera className="h-4 w-4" /> Take a photo
      </button>
    </div>
  );
}
