"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function AnalyticsPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  // Fetch summary first
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/analytics?summary=true");
        if (!res.ok) throw new Error("Failed to fetch analytics summary");
        setSummary(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  // Fetch charts lazily after summary
  useEffect(() => {
    if (!summary) return;

    async function loadCharts() {
      try {
        const res = await fetch("/api/analytics?full=true");
        if (!res.ok) throw new Error("Failed to fetch full analytics data");
        setCharts(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadCharts();
  }, [summary]);

  const questionHistogramBuckets = useMemo(() => {
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-[50vh]">
        Loading analytics...
      </div>
    );

  if (error)
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto mt-16">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (!summary) return null;

  const adaptivePercentage = Math.round(
    (summary.adaptiveQuizzes / summary.totalQuizzes) * 100
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-6">📊 Quiz Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Total Quizzes", value: summary.totalQuizzes },
          { label: "Adaptive Quizzes", value: `${adaptivePercentage}%` },
          { label: "Avg Questions", value: summary.avgQuestions ?? 0 },
          { label: "Median Questions", value: summary.medianQuestions ?? 0 },
        ].map((item, i) => (
          <Card key={i} className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-center">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center">
              <div className="text-2xl sm:text-3xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Difficulty Distribution */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Difficulty Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {charts?.difficultyDistribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={charts.difficultyDistribution}
                    dataKey="value"
                    nameKey="name"
                    outerRadius="80%"
                    label
                  >
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

        {/* Question Types */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Question Types</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {charts?.questionTypeData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={charts.questionTypeData}
                    dataKey="count"
                    nameKey="type"
                    outerRadius="80%"
                    label
                  >
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

        {/* Questions per Quiz */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Questions Per Quiz</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[260px]">
            {questionHistogramBuckets.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionHistogramBuckets}>
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

      {/* Trend + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Trend */}
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Quizzes Created (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-80">
            {charts?.trendData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quizzes"
                    stroke={COLORS[1]}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Radar */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Quiz Style Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[350px] overflow-visible">
            {charts?.radarProfile?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={charts.radarProfile}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis
                    domain={[
                      0,
                      Math.max(...charts.radarProfile.map((r: any) => r.score)) || 1,
                    ]}
                  />
                  <Radar
                    dataKey="score"
                    stroke={COLORS[0]}
                    fill={COLORS[0]}
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Quizzes & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Top Quizzes Table */}
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Top Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[400px]">
            {charts?.topQuizzes?.length ? (
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Questions</TableHead>
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

        {/* AI Insights */}
     <Card className="min-w-0 overflow-hidden">
  <CardHeader>
    <CardTitle>AI Insights</CardTitle>
  </CardHeader>
  <CardContent className="overflow-auto max-h-[400px] space-y-4">
    {charts?.insights ? (
      charts.insights
        .replace(/\*\*/g, "") // remove bold markdown
        .split(/\n{2,}/) // split by double line breaks into paragraphs
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
