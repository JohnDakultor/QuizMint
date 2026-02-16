import React from "react";
import { Facebook, Linkedin, XIcon } from "lucide-react";
import Link from "next/link";
import icon from "@/public/icon.png";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image src={icon} alt="Logo" className="w-15 h-15" />
              <span className="font-bold text-xl">QuizMintAI</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              The most powerful AI quiz generator for educators, students, and
              professionals. Create unlimited quizzes from any content.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com/Quizmintai"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/Quizmintai"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                aria-label="X"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/quizmint-ai-7875a43a8?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
              <li><a href="#testimonials" className="hover:text-blue-600 transition-colors">Testimonials</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">By Audience</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/ai-quiz-generator" className="hover:text-blue-600 transition-colors">AI Quiz Generator</Link></li>
              <li><Link href="/quiz-generator-for-students" className="hover:text-blue-600 transition-colors">For Students</Link></li>
              <li><Link href="/quiz-generator-for-teachers" className="hover:text-blue-600 transition-colors">For Teachers</Link></li>
              <li><Link href="/quiz-generator-for-corporate" className="hover:text-blue-600 transition-colors">For Corporate</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/blog" className="hover:text-blue-600 transition-colors">Blog</Link></li>
              <li><Link href="/ai-quiz-generator" className="hover:text-blue-600 transition-colors">AI Quiz + Lesson Plans</Link></li>
              <li><Link href="/quiz-generator-for-teachers" className="hover:text-blue-600 transition-colors">For Teachers</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/about" className="hover:text-blue-600 transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
              <li><a href="https://quizmintai.com/terms" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
              <li><a href="https://quizmintai.com/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            <p className="mb-2">
              <strong>QuizMintAI</strong> is an advanced AI-powered quiz generator that helps educators,
              students, and corporate trainers create high-quality quizzes instantly.
            </p>
            <p>
              Keywords: quiz maker, test generator, AI quiz creator, online assessment tool,
              study quiz builder, quiz creator for teachers, student quiz tool.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
            <p>&copy; {new Date().getFullYear()} QuizMintAI</p>
            <p className="flex items-center gap-2">
              Made with <span className="text-red-500">&#10084;</span> for educators worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
