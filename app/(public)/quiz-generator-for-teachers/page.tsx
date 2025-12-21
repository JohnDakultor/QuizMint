// app/quiz-generator-for-teachers/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Quiz Generator for Teachers | QuizMint AI",
  description: "QuizMint AI helps teachers generate quizzes quickly using AI, with file upload/download, free and premium tiers.",
  openGraph: {
    title: "AI Quiz Generator for Teachers | QuizMint AI",
    description: "Create quizzes for your classroom in seconds. Upload lesson files, download quizzes, and choose free or premium tiers.",
    url: "https://quizmintai.com/quiz-generator-for-teachers",
  },
};

export default function QuizGeneratorForTeachersPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          AI Quiz Generator for Teachers
        </h1>
        <p className="text-lg text-gray-700">
          Save time in the classroom with AI-generated quizzes. Upload lesson files, download quizzes, and choose from free or premium options.
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Why Teachers Love QuizMint AI</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Generate quizzes instantly from lesson files.</li>
          <li>Free tier for basic quizzes, small paid plan for advanced features.</li>
          <li>Download quizzes for printing or sharing with students.</li>
          <li>Supports multiple question types and difficulty levels.</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How Teachers Can Use It</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Upload lesson files or type a topic.</li>
          <li>Select quiz settings (questions, difficulty).</li>
          <li>Click "Generate Quiz" — AI creates it instantly.</li>
          <li>Download or share quizzes with students.</li>
        </ol>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Use Cases in Education</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Classroom assessments and tests</li>
          <li>Homework and practice quizzes</li>
          <li>Online course evaluations</li>
          <li>Corporate training and workshops</li>
        </ul>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <strong>Is this tool suitable for teachers?</strong>
            <p>Yes, it saves time by generating quizzes from your content instantly.</p>
          </div>
          <div>
            <strong>Can I upload lesson files?</strong>
            <p>Absolutely! AI uses your uploaded files to create customized quizzes.</p>
          </div>
          <div>
            <strong>Do I need a paid plan?</strong>
            <p>You can use the free tier for basic quizzes. The paid plan adds file uploads, priority generation, and advanced features.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">Start Creating Quizzes Today</h2>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          Generate Quizzes for Teachers
        </a>
      </section>
    </main>
  );
}
