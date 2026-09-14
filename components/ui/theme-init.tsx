"use client";
import { useEffect } from "react";
import { applyStoredPrefs } from "@/lib/theme";

/**
 * Inline preferences bootstrapper.
 *
 * The <script> tag runs before React hydrates so there's no flash of the
 * wrong theme on first paint. The useEffect handles route transitions and
 * cross-tab writes.
 */
export function ThemeInit() {
  useEffect(() => {
    applyStoredPrefs();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("lwm.")) applyStoredPrefs();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('lwm.theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.classList.toggle('dark',t==='dark');d.dataset.theme=t;d.dataset.font=localStorage.getItem('lwm.font')||'default';d.dataset.fs=localStorage.getItem('lwm.fs')||'md';d.dataset.zen=localStorage.getItem('lwm.zen')==='1'?'1':'0';}catch(e){}})();`,
      }}
    />
  );
}
