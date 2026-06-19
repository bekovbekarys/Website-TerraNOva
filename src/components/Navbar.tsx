import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import type { CurrentUser } from "@/lib/session";
import { getDict, getLocale } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Navbar({ user }: { user: CurrentUser | null }) {
  const dict = getDict();
  const t = dict.nav;
  const locale = getLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="font-serif text-xl font-bold text-stone-900">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/browse">{t.browse}</NavLink>
          <NavLink href="/guidelines">{t.guidelines}</NavLink>
          <NavLink href="/about">{t.about}</NavLink>
          <NavLink href="/support">{t.support}</NavLink>
          <NavLink href="/submit">{t.submit}</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          {user ? (
            <UserMenu user={user} t={dict.userMenu} />
          ) : (
            <>
              <Link href="/login" className="btn-secondary hidden sm:inline-flex">
                {t.signIn}
              </Link>
              <Link href="/register" className="btn-primary">
                {t.getStarted}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
    >
      {children}
    </Link>
  );
}
