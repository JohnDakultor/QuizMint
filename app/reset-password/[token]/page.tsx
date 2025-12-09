// app/reset-password/[token]/page.tsx

import { Metadata } from "next";
import ResetPasswordClient from "@/components/ui/reset-password";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordClient token={token} />;
}