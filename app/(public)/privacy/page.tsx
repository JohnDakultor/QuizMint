export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-gray-700">Last updated: December 2025</p>

      <p className="text-gray-700">
        Your privacy is important to us. This Privacy Policy explains how QuizMint
        collects, uses, and protects your information.
      </p>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
        <h3 className="font-semibold">a. Information You Provide</h3>
        <ul className="list-disc list-inside text-gray-700">
          <li>Name, email address, and account details</li>
          <li>Content you upload (text, documents, prompts)</li>
        </ul>
        <h3 className="font-semibold">b. Automatically Collected Information</h3>
        <ul className="list-disc list-inside text-gray-700">
          <li>IP address</li>
          <li>Device and browser information</li>
          <li>Usage data (pages visited, actions taken)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
        <p className="text-gray-700">We use your information to:</p>
        <ul className="list-disc list-inside text-gray-700">
          <li>Provide and improve the Service</li>
          <li>Generate quizzes and related content</li>
          <li>Communicate with you</li>
          <li>Ensure security and prevent abuse</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">3. Cookies and Analytics</h2>
        <p className="text-gray-700">
          We may use cookies and similar technologies for functionality and
          analytics. Third-party services (e.g., Google Analytics, Google AdSense)
          may collect data according to their own policies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">4. Advertising and Cookies</h2>
        <p className="text-gray-700">
          We use Google AdSense and similar services. These providers may place or
          read cookies and collect device data to show relevant ads. Where required
          by law, we may request your consent for cookies or ad personalization.
          You can opt out of personalized ads through your browser settings or
          Google Ad settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">5. Data Sharing</h2>
        <p className="text-gray-700">
          We do not sell your personal data. We may share data only:
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li>With service providers required to operate QuizMint</li>
          <li>When required by law</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">6. Data Security</h2>
        <p className="text-gray-700">
          We implement reasonable technical and organizational measures to protect
          your data, but no system is 100% secure.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">7. Data Retention</h2>
        <p className="text-gray-700">
          We retain your data only as long as necessary to provide the Service or
          comply with legal obligations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">8. Your Rights</h2>
        <p className="text-gray-700">
          Depending on your location, you may have the right to:
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li>Access your personal data</li>
          <li>Request correction or deletion</li>
          <li>Withdraw consent</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">9. AI Processing and Third-Party Providers</h2>
        <p className="text-gray-700">
          We use third-party AI providers to generate content (e.g., quizzes, lesson
          plans, images). This may require sending your inputs (text, prompts,
          uploads) to those providers for processing. Depending on provider settings,
          submitted content may be used to improve their models. Do not submit
          sensitive or confidential data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">10. Children&apos;s Privacy</h2>
        <p className="text-gray-700">
          QuizMint is not intended for children under 13. We do not knowingly
          collect data from children.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
        <p className="text-gray-700">
          We may update this Privacy Policy from time to time. Updates will be
          posted on this page.
        </p>
      </section>

      <p className="text-gray-500 text-sm">(c) QuizMint</p>
    </div>
  );
}
