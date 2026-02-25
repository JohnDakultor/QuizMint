import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminLoginForm from "@/components/admin/admin-login-form";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginWithSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const expected = (process.env.ADMIN_LOGIN_SLUG || "").trim();

  if (!expected || slug !== expected) {
    notFound();
  }

  return <AdminLoginForm />;
}
