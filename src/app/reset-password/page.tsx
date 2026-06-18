import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const token = searchParams.token ?? "";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo className="h-10 w-10" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Choose a new password</h1>
          <p className="mt-1 text-stone-600">
            Enter a new password for your account below.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
