// app/quiz-generator-for-students/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Quiz and Lesson Plan Generator for Students | QuizMint AI",
  description: "QuizMint AI helps students create practice quizzes and lesson plans using AI. Upload study material, generate outputs, and export them easily.",
  openGraph: {
    title: "AI Quiz and Lesson Plan Generator for Students | QuizMint AI",
    description: "Generate study quizzes and lesson plans instantly with AI. Upload notes, customize outputs, and use free or premium tiers.",
    url: "https://quizmintai.com/quiz-generator-for-students",
  },
  alternates: {
    canonical: "https://quizmintai.com/quiz-generator-for-students",
  },
};

export default function QuizGeneratorForStudentsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          AI Quiz Generator for Students
        </h1>
        <p className="text-lg text-gray-700">
          Practice smarter with AI-generated quizzes and lesson plans. Upload your notes, generate customized outputs, and export them instantly.
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Why Students Use QuizMint AI</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Generate quizzes quickly from your notes or study materials.</li>
          <li>Free tier available for basic quizzes, small paid plan for advanced features.</li>
          <li>Download quizzes for offline practice or sharing with classmates.</li>
          <li>Customizable question types and difficulty levels.</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How Students Can Use It</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Upload your study notes or enter a topic.</li>
          <li>Choose the number of questions and difficulty.</li>
          <li>Click "Generate Quiz" and AI will create it instantly.</li>
          <li>Download or review the quiz for practice.</li>
        </ol>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <strong>Is this tool free for students?</strong>
            <p>Yes, the free tier allows generating quizzes without payment. Premium features are optional.</p>
          </div>
          <div>
            <strong>Can I upload my study notes?</strong>
            <p>Yes, AI will use your uploaded files to generate quizzes based on your content.</p>
          </div>
          <div>
            <strong>Do I need an account?</strong>
            <p>An account is optional. Free tier works without signing up.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">Start Practicing Smarter</h2>
        <a
          href="/"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          Generate Quizzes for Students
        </a>
      </section>
    </main>
  );
}
