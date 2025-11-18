"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">🎉 Subscription Successful!</h1>

      <p className="mt-4 text-lg">
        Thank you for subscribing. Your session ID:
      </p>

      <code className="mt-2 bg-gray-200 p-2 rounded text-sm">
        {sessionId || "No session ID found"}
      </code>

      <p className="mt-6">You can now use all premium features.</p>
    </div>
  );
}
