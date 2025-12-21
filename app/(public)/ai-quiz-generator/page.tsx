// app/ai-quiz-generator/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Quiz Generator with File Upload | QuizMint AI",
  description: "QuizMint AI lets you generate quizzes instantly using AI, upload or download quizzes, with free and premium tiers available.",
  openGraph: {
    title: "AI Quiz Generator with File Upload | QuizMint AI",
    description: "Generate quizzes instantly, upload your content, and download quizzes. Free tier available, small paid plan for advanced features.",
    url: "https://quizmintai.com/ai-quiz-generator",
  },
};

export default function AIQuizGeneratorPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          AI Quiz Generator with Upload & Download Features
        </h1>
        <p className="text-lg text-gray-700">
          Create quizzes instantly using AI. Upload your files, download quizzes, and enjoy a free tier or small paid plan for advanced features.
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Why Choose QuizMint AI?</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Generate quizzes instantly with AI-powered technology.</li>
          <li>Upload content files to create customized quizzes.</li>
          <li>Download quizzes for offline use or printing.</li>
          <li>Flexible pricing: free tier for basic use, small paid plan for advanced features.</li>
        </ul>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-2">
          <li>Enter your quiz topic or upload your content file.</li>
          <li>Choose the number of questions and difficulty level.</li>
          <li>Click "Generate Quiz" and AI will create it instantly.</li>
          <li>Download the quiz or share it with students directly.</li>
        </ol>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Who Can Use It?</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Teachers in schools, colleges, or online courses.</li>
          <li>Students preparing for exams or self-study.</li>
          <li>Corporate trainers and educators creating assessments.</li>
        </ul>
      </section>

      {/* Pricing Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Pricing Options</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Free tier: Generate and download basic quizzes.</li>
          <li>Premium plan: Small monthly fee for advanced features, including multiple file uploads and priority generation.</li>
        </ul>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions (FAQ)</h2>
        <div className="space-y-4 text-gray-700">
          <div>
            <strong>Is this quiz generator free?</strong>
            <p>Yes! There is a free tier available. You can generate and download basic quizzes without paying.</p>
          </div>
          <div>
            <strong>Do I need an account?</strong>
            <p>No account is required for the free tier, but creating one allows managing and saving quizzes, plus accessing premium features.</p>
          </div>
          <div>
            <strong>Can I upload files to generate quizzes?</strong>
            <p>Yes, QuizMint AI supports file uploads. The AI will use your uploaded content to generate quizzes automatically.</p>
          </div>
          <div>
            <strong>Is this tool suitable for teachers?</strong>
            <p>Absolutely! It helps educators save time and create interactive quizzes quickly with AI assistance.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">Start Generating Quizzes Now</h2>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Try QuizMint AI for Free
        </a>
      </section>
    </main>
  );
}
