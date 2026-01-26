export async function verifyRecaptcha(token: string) {
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
