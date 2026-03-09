import { test, expect } from "@playwright/test";

test.describe("API smoke", () => {
  test("GET /api/quizzes/latest requires auth", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/quizzes/latest`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/generate-quiz requires auth and returns requestId", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/generate-quiz`, {
      data: { text: "Create a 10-item quiz about ecosystems" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(typeof body?.requestId).toBe("string");
  });

  test("POST /api/upload-file requires auth", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/upload-file`);
    expect(res.status()).toBe(401);
  });
});
