"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  suffix?: React.ReactNode;
};

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  className,
  ariaLabel,
  disabled,
  suffix,
}: Props) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  function dec() {
    onChange(clamp(value - step));
  }
  function inc() {
    onChange(clamp(value + step));
  }
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      onChange(min);
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) onChange(clamp(n));
  }

  return (
    <div
      className={cn(
        "inline-flex h-11 w-full items-stretch rounded-xl border border-input bg-transparent overflow-hidden select-none",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        aria-label={`Decrease ${ariaLabel ?? "value"}`}
        disabled={value <= min}
        className="flex w-11 items-center justify-center border-r border-input text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={onInputChange}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-transparent text-center text-base font-semibold outline-none"
      />
      {suffix && (
        <span className="flex items-center pr-2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
      <button
        type="button"
        onClick={inc}
        aria-label={`Increase ${ariaLabel ?? "value"}`}
        disabled={value >= max}
        className="flex w-11 items-center justify-center border-l border-input text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
