

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, ShieldCheck, Users } from "lucide-react";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            About QuizMintAI
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Smarter quizzes. Faster learning. Powered by AI.
          </p>
        </div>

        {/* Mission */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            QuizMintAI was built to make learning more effective and accessible.
            Our mission is to help students, professionals, and educators turn
            any content into meaningful quizzes using AI — saving time while
            improving understanding and retention.
          </CardContent>
        </Card>

        {/* What We Do */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3">
              <Brain className="h-6 w-6 text-blue-600" />
              <CardTitle>AI-Powered Learning</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-400">
              QuizMintAI uses advanced AI to generate quizzes from text, documents,
              and prompts — helping you learn faster with personalized
              difficulty and adaptive feedback.
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center gap-3">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <CardTitle>Built for Simplicity</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-400">
              We focus on clean design and ease of use, so you can spend less
              time setting things up and more time actually learning.
            </CardContent>
          </Card>
        </div>

        {/* Trust & Security */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <CardTitle>Trust & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your data matters to us. We are committed to protecting your
            information and being transparent about how it is used. QuizMintAI
            follows industry best practices for security and privacy.
          </CardContent>
        </Card>

        {/* Who It's For */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            <CardTitle>Who QuizMintAI Is For</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-600 dark:text-zinc-400">
            <ul className="list-disc list-inside space-y-2">
              <li>Students preparing for exams</li>
              <li>Professionals learning new skills</li>
              <li>Educators creating engaging quizzes</li>
              <li>Anyone who wants to learn smarter, not harder</li>
            </ul>
          </CardContent>
        </Card>

       
      </div>
    </div>
  );
}
