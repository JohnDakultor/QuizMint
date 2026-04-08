"use client";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const waitForRecaptcha = async (timeoutMs = 3000, intervalMs = 150) => {
    const startedAt = Date.now();
    while (!executeRecaptcha && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return executeRecaptcha;
  };

  const getToken = async (action: string) => {
    if (
      typeof window !== "undefined" &&
      (
        window.localStorage.getItem("cypress-test-mode") === "true" ||
        (window as Window & { Cypress?: unknown }).Cypress
      )
    ) {
      return "cypress-test-token";
    }

    const recaptchaExecutor = executeRecaptcha || (await waitForRecaptcha());

    if (!recaptchaExecutor) {
      throw new Error("Security check is still loading. Please try again in a moment.");
    }

    return await recaptchaExecutor(action);
  };

  return { getToken };
}
