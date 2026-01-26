"use client";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const getToken = async (action: string) => {
    if (!executeRecaptcha) {
      throw new Error("reCAPTCHA not ready");
    }

    return await executeRecaptcha(action);
  };

  return { getToken };
}
