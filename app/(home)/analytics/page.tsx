"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const COLORS = ["#60a5fa", "#34d399", "#f59e0b", "#f97316", "#ef4444"];

type AnalyticsMode = "quiz" | "lesson";

export default function AnalyticsPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<AnalyticsMode>("quiz");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        setSummary(null);
        setCharts(null);

        const res = await fetch(`/api/analytics?mode=${mode}&summary=true`);
        if (res.status === 403) {
          router.replace("/subscription");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch analytics summary");
        setSummary(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [mode, router]);

  useEffect(() => {
    if (!summary) return;

    async function loadCharts() {
      try {
        const res = await fetch(`/api/analytics?mode=${mode}&full=true`);
        if (!res.ok) throw new Error("Failed to fetch full analytics data");
        setCharts(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadCharts();
  }, [summary, mode]);

  const histogramBuckets = useMemo(() => {
    if (!charts?.questionDistribution) return [];
    const buckets = { "0": 0, "1-3": 0, "4-6": 0, "7-10": 0, "11+": 0 };
    charts.questionDistribution.forEach((q: any) => {
      const n = q.questions;
      if (n === 0) buckets["0"]++;
      else if (n <= 3) buckets["1-3"]++;
      else if (n <= 6) buckets["4-6"]++;
      else if (n <= 10) buckets["7-10"]++;
      else buckets["11+"]++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [charts]);

  if (error)
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto mt-16">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  const isLesson = mode === "lesson";
  const chartsLoading = Boolean(summary) && !charts;
  const percentage = Math.round(
    (((summary?.adaptiveQuizzes as number) || 0) /
      Math.max((summary?.totalQuizzes as number) || 1, 1)) *
      100
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">
          {isLesson ? "Lesson Plan Analytics" : "Quiz Analytics"}
        </h1>
        <div className="inline-flex rounded-lg border bg-white p-1">
          <Button
            size="sm"
            variant={!isLesson ? "default" : "ghost"}
            onClick={() => setMode("quiz")}
          >
            Quiz
          </Button>
          <Button
            size="sm"
            variant={isLesson ? "default" : "ghost"}
            onClick={() => setMode("lesson")}
          >
            Lesson Plans
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: isLesson ? "Total Plans" : "Total Quizzes", value: summary?.totalQuizzes },
          {
            label: isLesson ? "Multi-Day Plans" : "Adaptive Quizzes",
            value: `${percentage}%`,
          },
          { label: isLesson ? "Avg Days" : "Avg Questions", value: summary?.avgQuestions ?? 0 },
          {
            label: isLesson ? "Median Days" : "Median Questions",
            value: summary?.medianQuestions ?? 0,
          },
        ].map((item, i) => (
          <Card key={i} className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-center">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-16">
              {loading || !summary ? (
                <SkeletonLoading className="h-8 w-20" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold">{item.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{isLesson ? "Subject Distribution" : "Difficulty Distribution"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {loading || chartsLoading ? (
              <SkeletonLoading className="h-[220px] w-full" />
            ) : charts?.difficultyDistribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={charts.difficultyDistribution} dataKey="value" nameKey="name" outerRadius="80%" label>
                    {charts.difficultyDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{isLesson ? "Grade Distribution" : "Question Types"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {loading || chartsLoading ? (
              <SkeletonLoading className="h-[220px] w-full" />
            ) : charts?.questionTypeData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={charts.questionTypeData} dataKey="count" nameKey="type" outerRadius="80%" label>
                    {charts.questionTypeData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{isLesson ? "Days Per Plan" : "Questions Per Quiz"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {loading || chartsLoading ? (
              <SkeletonLoading className="h-[220px] w-full" />
            ) : histogramBuckets.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramBuckets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS[2]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>
              {isLesson ? "Lesson Plans Created (Last 30 days)" : "Quizzes Created (Last 30 days)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-80">
            {loading || chartsLoading ? (
              <SkeletonLoading className="h-[280px] w-full" />
            ) : charts?.trendData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="quizzes" stroke={COLORS[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{isLesson ? "Lesson Plan Profile" : "Quiz Style Profile"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[350px] overflow-visible">
            {loading || chartsLoading ? (
              <SkeletonLoading className="h-[320px] w-full" />
            ) : charts?.radarProfile?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={charts.radarProfile}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis
                    domain={[0, Math.max(...charts.radarProfile.map((r: any) => r.score)) || 1]}
                  />
                  <Radar dataKey="score" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{isLesson ? "Top Lesson Plans" : "Top Quizzes"}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[400px]">
            {loading || chartsLoading ? (
              <div className="space-y-3">
                <SkeletonLoading className="h-6 w-full" />
                <SkeletonLoading className="h-6 w-full" />
                <SkeletonLoading className="h-6 w-full" />
                <SkeletonLoading className="h-6 w-full" />
              </div>
            ) : charts?.topQuizzes?.length ? (
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>{isLesson ? "Days" : "Questions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charts.topQuizzes.map((q: any) => (
                    <TableRow key={q.id ?? q.title + Math.random()}>
                      <TableCell className="truncate max-w-[200px]">{q.title}</TableCell>
                      <TableCell>{q.questions.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[400px] space-y-4">
            {loading || chartsLoading ? (
              <div className="space-y-3">
                <SkeletonLoading className="h-4 w-full" />
                <SkeletonLoading className="h-4 w-full" />
                <SkeletonLoading className="h-4 w-[90%]" />
                <SkeletonLoading className="h-4 w-full" />
              </div>
            ) : charts?.insights ? (
              charts.insights
                .replace(/\*\*/g, "")
                .split(/\n{2,}/)
                .map((paragraph: string, i: number) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  return (
                    <p key={i} className="text-sm text-gray-700">
                      {trimmed}
                    </p>
                  );
                })
            ) : (
              <div className="text-center text-gray-500">No insights available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
