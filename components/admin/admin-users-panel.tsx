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
  activeUsersLast7Days?: number;
};

type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  quizUsage: number;
  lessonPlanUsage: number;
  lastQuizAt: string | null;
  lastLessonPlanAt: string | null;
  createdAt: string;
};

type LatestActivityUser = {
  id: string;
  email: string;
  subscriptionPlan: string | null;
  lastQuizAt?: string | null;
  lastLessonPlanAt?: string | null;
  createdAt?: string | null;
};

type CohortSummaryRow = {
  cohortWeek: string;
  newUsers: number;
  returnedD1: number;
  returnedD7: number;
  d1Rate: number;
  d7Rate: number;
};

type AdminGenerationEvent = {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: string;
  feature: string | null;
  status: string;
  plan: string | null;
  latencyMs: number | null;
  provider: string | null;
  metadata: unknown;
  createdAt: string;
};

function getGenerationEventCause(event: AdminGenerationEvent): string {
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) {
    return "-";
  }
  const meta = event.metadata as Record<string, unknown>;

  const directMessage = meta.message;
  if (typeof directMessage === "string" && directMessage.trim().length > 0) {
    return directMessage;
  }

  const provider = typeof meta.provider === "string" ? meta.provider : null;
  const providerCode =
    typeof meta.providerCode === "number" || typeof meta.providerCode === "string"
      ? String(meta.providerCode)
      : null;
  const providerIssue = meta.providerIssue === true;

  if (providerIssue || provider || providerCode) {
    const providerLabel = provider ?? "unknown_provider";
    const codeLabel = providerCode ? ` (${providerCode})` : "";
    return `Provider issue: ${providerLabel}${codeLabel}`;
  }

  return "-";
}

function getGenerationEventTimings(event: AdminGenerationEvent): string {
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) {
    return "-";
  }
  const meta = event.metadata as Record<string, unknown>;
  const stageRaw =
    meta.stageMs && typeof meta.stageMs === "object" && !Array.isArray(meta.stageMs)
      ? (meta.stageMs as Record<string, unknown>)
      : null;
  if (!stageRaw) return "-";

  const keys = ["contentPrep", "ingest", "rag", "ai", "cacheWrite", "dbWrite"] as const;
  const parts: string[] = [];
  for (const key of keys) {
    const value = stageRaw[key];
    if (typeof value === "number" && value > 0) {
      parts.push(`${key}:${value}ms`);
    }
  }
  return parts.length > 0 ? parts.join(" | ") : "-";
}

function getGenerationEventRouting(event: AdminGenerationEvent): string {
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) {
    return "-";
  }
  const meta = event.metadata as Record<string, unknown>;
  const retryCount = typeof meta.retryCount === "number" ? meta.retryCount : 0;
  const fallbackUsed = meta.fallbackUsed === true;
  const finalModel = typeof meta.finalModel === "string" ? meta.finalModel : null;
  const finalProvider = typeof meta.finalProvider === "string" ? meta.finalProvider : null;

  const parts: string[] = [`retries:${retryCount}`];
  if (fallbackUsed) parts.push("fallback:yes");
  if (finalModel) parts.push(`model:${finalModel}`);
  if (finalProvider) parts.push(`provider:${finalProvider}`);
  return parts.join(" | ");
}

function splitPipeLines(value: string): string[] {
  if (!value || value === "-") return ["-"];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function AdminUsersPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [latestQuizUsers, setLatestQuizUsers] = useState<LatestActivityUser[]>([]);
  const [latestLessonUsers, setLatestLessonUsers] = useState<LatestActivityUser[]>([]);
  const [latestSignups, setLatestSignups] = useState<LatestActivityUser[]>([]);
  const [cohorts, setCohorts] = useState<CohortSummaryRow[]>([]);
  const [generationEvents, setGenerationEvents] = useState<AdminGenerationEvent[]>([]);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "premium">("pro");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, cohortsRes] = await Promise.all([
        fetch("/api/admin/users?limit=100", { cache: "no-store" }),
        fetch("/api/admin/cohorts?weeks=12", { cache: "no-store" }),
      ]);
      const data = await usersRes.json();
      const cohortsData = await cohortsRes.json().catch(() => ({ cohorts: [] }));
      if (usersRes.status === 428 || data?.error === "challenge") {
        router.push("/admin");
        setLoading(false);
        return;
      }
      if (!usersRes.ok) throw new Error(data?.error || "Failed to fetch admin data");
      setSummary(data.summary);
      setUsers(data.users || []);
      setLatestQuizUsers(data?.latestActivity?.quiz || []);
      setLatestLessonUsers(data?.latestActivity?.lessonPlan || []);
      setLatestSignups(data?.latestSignups || []);
      setGenerationEvents(data?.generationEvents || []);
      setCohorts(Array.isArray(cohortsData?.cohorts) ? cohortsData.cohorts : []);
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
      { label: "Active (7d)", value: summary?.activeUsersLast7Days ?? 0 },
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
          <CardTitle>Latest Usage Activity</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Latest Quiz Generation</h3>
            <div className="space-y-2 text-sm">
              {latestQuizUsers.length === 0 && <div className="text-zinc-500">No quiz activity yet.</div>}
              {latestQuizUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="truncate pr-3">{u.email}</div>
                  <div className="text-zinc-500 whitespace-nowrap">
                    {u.lastQuizAt ? new Date(u.lastQuizAt).toLocaleString() : "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Latest Lesson Plan Generation</h3>
            <div className="space-y-2 text-sm">
              {latestLessonUsers.length === 0 && (
                <div className="text-zinc-500">No lesson plan activity yet.</div>
              )}
              {latestLessonUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="truncate pr-3">{u.email}</div>
                  <div className="text-zinc-500 whitespace-nowrap">
                    {u.lastLessonPlanAt ? new Date(u.lastLessonPlanAt).toLocaleString() : "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Cohort Retention (D1 / D7)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Cohort Week</th>
                <th className="py-2 text-left">New Users</th>
                <th className="py-2 text-left">D1 Returned</th>
                <th className="py-2 text-left">D1 Rate</th>
                <th className="py-2 text-left">D7 Returned</th>
                <th className="py-2 text-left">D7 Rate</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-500" colSpan={6}>
                    No cohort data yet.
                  </td>
                </tr>
              ) : (
                cohorts.map((row) => (
                  <tr key={row.cohortWeek} className="border-b">
                    <td className="py-2">{new Date(row.cohortWeek).toLocaleDateString()}</td>
                    <td className="py-2">{row.newUsers}</td>
                    <td className="py-2">{row.returnedD1}</td>
                    <td className="py-2">{row.d1Rate}%</td>
                    <td className="py-2">{row.returnedD7}</td>
                    <td className="py-2">{row.d7Rate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest User Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {latestSignups.length === 0 && <div className="text-zinc-500">No signups yet.</div>}
            {latestSignups.map((u) => (
              <div key={u.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="truncate pr-3">{u.email}</div>
                <div className="text-zinc-500 whitespace-nowrap">
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Event Log (Latest 30)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto rounded-md border">
          <table className="w-full min-w-[1320px] table-fixed text-xs md:text-sm">
            <colgroup>
              <col className="w-[170px]" />
              <col className="w-[220px]" />
              <col className="w-[130px]" />
              <col className="w-[130px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[230px]" />
              <col className="w-[230px]" />
              <col className="w-[260px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <tr className="border-b">
                <th className="py-2 pr-2 text-left">Time</th>
                <th className="py-2 pr-2 text-left">User</th>
                <th className="py-2 pr-2 text-left">Event</th>
                <th className="py-2 pr-2 text-left">Feature</th>
                <th className="py-2 pr-2 text-left">Status</th>
                <th className="py-2 pr-2 text-left">Provider</th>
                <th className="py-2 pr-2 text-left">Cause</th>
                <th className="py-2 pr-2 text-left">Routing</th>
                <th className="py-2 pr-2 text-left">Stage Timings</th>
                <th className="py-2 pr-2 text-left">Plan</th>
                <th className="py-2 pr-2 text-left">Latency</th>
              </tr>
            </thead>
            <tbody>
              {generationEvents.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-500" colSpan={11}>
                    No generation events yet.
                  </td>
                </tr>
              ) : (
                generationEvents.map((event) => (
                  <tr key={event.id} className="border-b align-top hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                    <td className="py-2 pr-2 align-top whitespace-nowrap text-[11px] md:text-xs">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-2 align-top">
                      <div className="truncate" title={event.email || "-"}>
                        {event.email || "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-top whitespace-nowrap font-medium">{event.eventType}</td>
                    <td className="py-2 pr-2 align-top break-words">{event.feature || "-"}</td>
                    <td className="py-2 pr-2 align-top whitespace-nowrap">
                      <span className="rounded border px-2 py-0.5 text-[11px] md:text-xs">
                        {event.status}
                      </span>
                    </td>
                    <td className="py-2 pr-2 align-top break-words">{event.provider || "-"}</td>
                    <td className="py-2 pr-2 align-top whitespace-normal break-words leading-snug" title={getGenerationEventCause(event)}>
                      <div className="space-y-0.5">
                        {splitPipeLines(getGenerationEventCause(event)).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-top whitespace-normal break-words leading-snug" title={getGenerationEventRouting(event)}>
                      <div className="space-y-0.5 text-zinc-600 dark:text-zinc-300">
                        {splitPipeLines(getGenerationEventRouting(event)).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-top whitespace-normal break-words leading-snug" title={getGenerationEventTimings(event)}>
                      <div className="space-y-0.5 font-mono text-[11px] md:text-xs">
                        {splitPipeLines(getGenerationEventTimings(event)).map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-top whitespace-nowrap">{event.plan || "free"}</td>
                    <td className="py-2 pr-2 align-top whitespace-nowrap">{typeof event.latencyMs === "number" ? `${event.latencyMs}ms` : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <th className="py-2 text-left">Last Quiz</th>
                <th className="py-2 text-left">Last Lesson</th>
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
                  <td className="py-2">{u.lastQuizAt ? new Date(u.lastQuizAt).toLocaleString() : "-"}</td>
                  <td className="py-2">
                    {u.lastLessonPlanAt ? new Date(u.lastLessonPlanAt).toLocaleString() : "-"}
                  </td>
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
