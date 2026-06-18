import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { AccountForm } from "@/components/AccountForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account settings" };

export default async function AccountPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login?next=/account");

  const user = await prisma.user.findUnique({
    where: { id: current.id },
    select: {
      name: true,
      email: true,
      affiliation: true,
      orcid: true,
      role: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-bold">Account settings</h1>
      <p className="mt-1 text-stone-600">
        Manage your profile details and password.
      </p>

      {user.role === "ADMIN" && (
        <div className="mt-6 rounded-lg border border-terra-200 bg-terra-50 px-4 py-3 text-sm text-terra-800">
          This account has <strong>moderator</strong> privileges.
        </div>
      )}

      <div className="card mt-6 p-6 sm:p-8">
        <AccountForm
          initial={{
            name: user.name,
            email: user.email,
            affiliation: user.affiliation ?? "",
            orcid: user.orcid ?? "",
          }}
        />
      </div>
    </div>
  );
}
