import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";
import { getDict } from "@/lib/i18n";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
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
          <h1 className="mt-4 text-2xl font-bold">{t.welcomeBack}</h1>
          <p className="mt-1 text-stone-600">{t.welcomeBackSub}</p>
        </div>
        <div className="card p-6 sm:p-8">
          <AuthForm mode="login" t={t} />
        </div>
      </div>
    </div>
  );
}
