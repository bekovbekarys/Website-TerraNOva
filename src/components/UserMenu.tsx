"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUser } from "@/lib/session";

export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-1 pr-3 transition hover:bg-stone-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-terra-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-stone-700 sm:inline">
          {user.name.split(" ")[0]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-stone-900">
              {user.name}
            </p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
          </div>
          <MenuItem href="/dashboard" onClick={() => setOpen(false)}>
            My submissions
          </MenuItem>
          <MenuItem href="/submit" onClick={() => setOpen(false)}>
            Submit a preprint
          </MenuItem>
          <MenuItem href="/account" onClick={() => setOpen(false)}>
            Account settings
          </MenuItem>
          {user.role === "ADMIN" && (
            <MenuItem href="/admin" onClick={() => setOpen(false)}>
              <span className="font-semibold text-terra-700">
                Moderation dashboard
              </span>
            </MenuItem>
          )}
          <button
            onClick={logout}
            className="block w-full border-t border-stone-100 px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm text-stone-700 transition hover:bg-stone-100"
    >
      {children}
    </Link>
  );
}
