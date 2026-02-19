import { redirect } from "next/navigation";
import { assertAdminSession, getAdminLoginPath } from "@/lib/admin-auth";
import AdminLogoutButton from "@/components/admin/admin-logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    redirect(getAdminLoginPath());
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500">{auth.email}</p>
          </div>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
