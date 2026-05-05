import { Facebook, Linkedin, XIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-12 mb-12 md:grid-cols-3 lg:grid-cols-6">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/icon.png" alt="QuizMintAI logo" className="h-12 w-12" width={48} height={48} />
              <span className="font-bold text-xl">QuizMintAI</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              AI teacher workflow software for quizzes, lesson plans,
              assignments, results review, and follow-up instruction.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com/Quizmintai"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-md bg-slate-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/Quizmintai"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-md bg-slate-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors"
                aria-label="X"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/quizmint-ai-7875a43a8?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-md bg-slate-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/#features" className="hover:text-teal-700 transition-colors">Features</Link></li>
              <li><Link href="/teacher-workflow-platform" className="hover:text-teal-700 transition-colors">Teacher Workflow</Link></li>
              <li><Link href="/#pricing" className="hover:text-teal-700 transition-colors">Pricing</Link></li>
              <li><Link href="/#testimonials" className="hover:text-teal-700 transition-colors">Teacher Proof</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Workflows</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/classroom-quiz-workflow" className="hover:text-teal-700 transition-colors">Classroom Quiz Workflow</Link></li>
              <li><Link href="/assignment-tracking-for-teachers" className="hover:text-teal-700 transition-colors">Assignment Tracking</Link></li>
              <li><Link href="/quiz-results-and-reteach-workflow" className="hover:text-teal-700 transition-colors">Results and Reteach</Link></li>
              <li><Link href="/classroom-intervention-workflow" className="hover:text-teal-700 transition-colors">Intervention Workflow</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Generators</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/quiz-generator-for-teachers" className="hover:text-teal-700 transition-colors">Quiz Generator for Teachers</Link></li>
              <li><Link href="/lesson-plan-generator-for-teachers" className="hover:text-teal-700 transition-colors">Lesson Plan Generator</Link></li>
              <li><Link href="/ai-quiz-generator" className="hover:text-teal-700 transition-colors">AI Quiz + Lesson Plans</Link></li>
              <li><Link href="/science-quiz-generator" className="hover:text-teal-700 transition-colors">Science Quiz Generator</Link></li>
              <li><Link href="/math-quiz-generator" className="hover:text-teal-700 transition-colors">Math Quiz Generator</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/resources" className="hover:text-teal-700 transition-colors">All Guides</Link></li>
              <li><Link href="/blog" className="hover:text-teal-700 transition-colors">Blog</Link></li>
              <li><Link href="/ai-tools-for-teachers" className="hover:text-teal-700 transition-colors">AI Tools for Teachers</Link></li>
              <li><Link href="/teacher-workspace-for-quizzes-and-lessons" className="hover:text-teal-700 transition-colors">Teacher Workspace</Link></li>
              <li><Link href="/disclaimer" className="hover:text-teal-700 transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/about" className="hover:text-teal-700 transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-teal-700 transition-colors">Contact</Link></li>
              <li><Link href="/terms" className="hover:text-teal-700 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-teal-700 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            <p className="mb-2">
              <strong>QuizMintAI</strong> helps educators create classroom
              materials, assign work, review results, and plan the next
              instructional step from one signed-in workspace.
            </p>
            <p>
              Keywords: teacher workflow software, AI quiz generator, lesson
              plan generator, assignment tracking, classroom results review,
              reteach workflow, intervention planning.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
            <p>&copy; {new Date().getFullYear()} QuizMintAI</p>
            <p className="flex items-center gap-2">
              Built for teachers who need the next step, not just the first draft
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
