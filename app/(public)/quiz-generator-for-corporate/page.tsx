// app/quiz-generator-for-corporate/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Quiz Generator for Corporate Training | QuizMint AI",
  description: "QuizMint AI helps professionals and corporate trainers generate quizzes for workshops, training, and skill assessments using AI.",
  openGraph: {
    title: "AI Quiz Generator for Corporate Training | QuizMint AI",
    description: "Create training quizzes, assessments, and workshops with AI. Free and paid tiers available for professional use.",
    url: "https://quizmintai.com/quiz-generator-for-corporate",
  },
};

export default function QuizGeneratorForCorporatePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          AI Quiz Generator for Corporate Training
        </h1>
        <p className="text-lg text-gray-700">
          Create professional training quizzes instantly using AI. Upload materials, generate assessments, and download them for workshops.
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Why Use QuizMint AI for Corporate Training</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Generate training quizzes from uploaded materials instantly.</li>
          <li>Free tier available for small-scale use; premium plan for advanced features.</li>
          <li>Download quizzes for workshops or online courses.</li>
          <li>Customizable questions and difficulty levels for professional assessments.</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How Corporate Users Can Use It</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Upload training material or enter a topic.</li>
          <li>Select the number of questions and difficulty level.</li>
          <li>Click "Generate Quiz" to create professional quizzes instantly.</li>
          <li>Download or share quizzes with employees and trainees.</li>
        </ol>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <strong>Can I use this for corporate training?</strong>
            <p>Yes, it’s ideal for workshops, professional courses, and skill assessments.</p>
          </div>
          <div>
            <strong>Does it support file uploads?</strong>
            <p>Yes, upload training materials and AI will generate quizzes based on them.</p>
          </div>
          <div>
            <strong>Is there a free version?</strong>
            <p>The free tier works for basic quizzes, while the premium plan offers advanced features.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">Start Generating Training Quizzes</h2>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          Generate Corporate Quizzes
        </a>
      </section>
    </main>
  );
}
