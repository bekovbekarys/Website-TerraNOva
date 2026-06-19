import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";
import { getDict } from "@/lib/i18n";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = getDict().auth;

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo className="h-10 w-10" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold">{t.createTitle}</h1>
          <p className="mt-1 text-stone-600">{t.createSub}</p>
        </div>
        <div className="card p-6 sm:p-8">
          <AuthForm mode="register" t={t} />
        </div>
        <p className="mt-6 text-center text-xs text-stone-500">
          {t.tosPre}
          <Link href="/terms" className="font-medium text-terra-700">
            {t.tosTerms}
          </Link>
          {t.tosAnd}
          <Link href="/privacy" className="font-medium text-terra-700">
            {t.tosPrivacy}
          </Link>
          {t.tosPost}
        </p>
      </div>
    </div>
  );
}
