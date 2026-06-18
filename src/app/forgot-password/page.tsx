import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo className="h-10 w-10" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-stone-600">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
