"use client";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

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

    if (!executeRecaptcha) {
      throw new Error("reCAPTCHA not ready");
    }

    return await executeRecaptcha(action);
  };

  return { getToken };
}
