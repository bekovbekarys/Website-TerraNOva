import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo className="h-10 w-10" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-stone-600">
            Join the community and start sharing your research.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <AuthForm mode="register" />
        </div>
        <p className="mt-6 text-center text-xs text-stone-500">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-medium text-terra-700">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-terra-700">
            Privacy Policy
          </Link>
          , and to post only scholarly work for which you hold the rights to
          share.
        </p>
      </div>
    </div>
  );
}
