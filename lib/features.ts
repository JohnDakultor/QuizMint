export function hasFeature(plan: string | null, feature: string) {
  const map: Record<string, string[]> = {
    free: [],
    pro: ["ai_difficulty", "export_google_forms"],
    premium: [
      "ai_difficulty",
      "adaptive_learning",
      "export_google_forms",
      "export_pdf",
      "export_csv",
      "advanced_analytics"
    ],
  };

  if (!plan || !map[plan]) return false;
  return map[plan].includes(feature);
}
