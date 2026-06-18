import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-serif text-xl font-bold text-stone-900">
              {SITE_NAME}
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-stone-600">{SITE_TAGLINE}.</p>
          <p className="mt-4 text-xs text-stone-400">
            Preprints are not peer-reviewed. Opinions expressed are those of the
            authors.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-stone-900">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              <Link href="/browse" className="hover:text-terra-700">
                Browse preprints
              </Link>
            </li>
            <li>
              <Link href="/submit" className="hover:text-terra-700">
                Submit a preprint
              </Link>
            </li>
            <li>
              <Link href="/guidelines" className="hover:text-terra-700">
                Submission guidelines
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-terra-700">
                About TerraNova
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-stone-900">Policies</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              <Link href="/about#moderation" className="hover:text-terra-700">
                Moderation policy
              </Link>
            </li>
            <li>
              <Link href="/about#licensing" className="hover:text-terra-700">
                Licensing
              </Link>
            </li>
            <li>
              <Link href="/about#contact" className="hover:text-terra-700">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-stone-400 sm:flex-row">
          <p>
            © 2025-{new Date().getFullYear()} {SITE_NAME}. Content licensed by
            authors under open licenses.
          </p>
          <p>Open science since 2025 · Powered by the community</p>
        </div>
      </div>
    </footer>
  );
}
