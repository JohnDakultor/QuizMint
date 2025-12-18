export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-gray-700">Last updated: December 2025</p>

      <p className="text-gray-700">
        Welcome to QuizMint. By accessing or using our website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use QuizMint.
      </p>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">1. Use of the Service</h2>
        <p className="text-gray-700">
          You must be at least 13 years old to use QuizMint. You agree to use the Service only for lawful purposes and are responsible for any content you upload or generate using the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">2. Accounts</h2>
        <p className="text-gray-700">
          You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information. We reserve the right to suspend or terminate accounts that violate these Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">3. AI-Generated Content</h2>
        <p className="text-gray-700">
          QuizMint uses AI to generate quizzes and related content. Generated content is provided "as-is" and may contain inaccuracies. You are responsible for reviewing and validating generated content before use.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
        <p className="text-gray-700">
          QuizMint and its branding, logos, and software are owned by us. You retain ownership of the content you upload. By using the Service, you grant us a limited license to process your content solely to provide the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">5. Payments</h2>
        <p className="text-gray-700">
          Paid features, if any, will be clearly described. All fees are non-refundable unless required by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">6. Prohibited Activities</h2>
        <ul className="list-disc list-inside text-gray-700">
          <li>Abuse, exploit, or attempt to reverse engineer the Service</li>
          <li>Upload malicious, illegal, or harmful content</li>
          <li>Interfere with the Service’s security or availability</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">7. Termination</h2>
        <p className="text-gray-700">
          We may suspend or terminate your access at any time if you violate these Terms or misuse the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">8. Disclaimer</h2>
        <p className="text-gray-700">
          The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
        <p className="text-gray-700">
          To the maximum extent permitted by law, QuizMint shall not be liable for indirect, incidental, or consequential damages.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">10. Changes to Terms</h2>
        <p className="text-gray-700">
          We may update these Terms from time to time. Continued use of the Service constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">11. Contact</h2>
        <p className="text-gray-700">
          For questions about these Terms, contact us at <a href="mailto:support@quizmint.com" className="text-blue-600 underline">support@quizmint.com</a>.
        </p>
      </section>

      <p className="text-gray-500 text-sm">© QuizMint</p>
    </div>
  );
}
