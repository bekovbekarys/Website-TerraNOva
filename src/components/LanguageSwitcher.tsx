"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const OPTIONS = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
] as const;

// Sets the locale cookie and refreshes so server components re-render in the
// chosen language. No page reload or route change needed.
export function LanguageSwitcher({ locale }: { locale: "en" | "ru" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(code: string) {
    if (code === locale) return;
    document.cookie = `locale=${code};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="flex items-center rounded-lg border border-stone-200 p-0.5 text-xs font-semibold"
      aria-label="Language"
    >
      {OPTIONS.map((opt) => {
        const active = opt.code === locale;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => choose(opt.code)}
            disabled={pending}
            aria-pressed={active}
            className={`rounded-md px-2 py-1 transition ${
              active
                ? "bg-terra-600 text-white"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
