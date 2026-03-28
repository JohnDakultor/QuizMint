export async function verifyRecaptcha(token: string) {
  if (
    token === "cypress-test-token" ||
    process.env.CYPRESS === "true" ||
    process.env.E2E_BYPASS_RECAPTCHA === "true"
  ) {
    return {
      success: true,
      score: 0.9,
      action: "cypress",
    };
  }

  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    }
  );

  const data = await res.json();

  return {
    success: data.success,
    score: data.score,
    action: data.action,
  };
}
