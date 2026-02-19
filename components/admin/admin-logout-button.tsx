"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/auth", {
        method: "DELETE",
        cache: "no-store",
      });
    } finally {
      setLoading(false);
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={loading}>
      {loading ? "Logging out..." : "Logout"}
    </Button>
  );
}
