"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AdminSummary = {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  newUsersLast7Days: number;
};

type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  quizUsage: number;
  lessonPlanUsage: number;
  createdAt: string;
};

export default function AdminUsersPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "premium">("pro");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users?limit=100", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 428 || data?.error === "challenge") {
        router.push("/admin");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to fetch admin data");
      setSummary(data.summary);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Users", value: summary?.totalUsers ?? 0 },
      { label: "Paid Users", value: summary?.paidUsers ?? 0 },
      { label: "Free Users", value: summary?.freeUsers ?? 0 },
      { label: "Pro Users", value: summary?.proUsers ?? 0 },
      { label: "Premium Users", value: summary?.premiumUsers ?? 0 },
      { label: "New (7d)", value: summary?.newUsersLast7Days ?? 0 },
    ],
    [summary]
  );

  async function updatePlan() {
    setUpdating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update subscription");
      setMessage(`Updated ${data.user.email} to ${data.user.subscriptionPlan}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin - Users</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "-" : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set User Plan By Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant={plan === "free" ? "default" : "outline"} onClick={() => setPlan("free")}>
              Free
            </Button>
            <Button variant={plan === "pro" ? "default" : "outline"} onClick={() => setPlan("pro")}>
              Pro
            </Button>
            <Button
              variant={plan === "premium" ? "default" : "outline"}
              onClick={() => setPlan("premium")}
            >
              Premium
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setPlan("free");
              }}
            >
              Cancel to Free
            </Button>
          </div>
          <Button onClick={updatePlan} disabled={updating || !email.trim()}>
            {updating ? "Updating..." : "Apply Plan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Plan</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Quiz Usage</th>
                <th className="py-2 text-left">Lesson Usage</th>
                <th className="py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.subscriptionPlan || "free"}</td>
                  <td className="py-2">{u.subscriptionStatus || "-"}</td>
                  <td className="py-2">{u.quizUsage}</td>
                  <td className="py-2">{u.lessonPlanUsage}</td>
                  <td className="py-2">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
