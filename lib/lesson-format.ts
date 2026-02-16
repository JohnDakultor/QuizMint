export function formatLesson(rawLesson: string) {
  // Clean unwanted markdown and repeated titles
  const cleaned = rawLesson
    .replace(/\*{1,3}/g, "") // remove bolds
    .replace(/#+/g, "")      // remove headers
    .trim();

  const sectionsOrder = ["Introduction", "Explanation", "Activity", "Assessment", "Homework"];
  const sections: { heading: string; content: string }[] = [];

  // Split by headings
  const sectionRegex = new RegExp(`(${sectionsOrder.join("|")})`, "gi");
  const parts = cleaned.split(sectionRegex).map(p => p.trim()).filter(Boolean);

  // Merge heading + content
  let lastHeading: string | null = null;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (sectionsOrder.includes(part)) {
      lastHeading = part;
      sections.push({ heading: part, content: "" });
    } else if (lastHeading) {
      const section = sections.find(s => s.heading === lastHeading);
      section!.content += (section!.content ? "\n\n" : "") + part;
    }
  }

  // Ensure all five sections exist
  sectionsOrder.forEach(heading => {
    if (!sections.find(s => s.heading === heading)) {
      sections.push({ heading, content: "Content not provided by AI." });
    }
  });

  // Fix truncated homework
  const homeworkSection = sections.find(s => s.heading === "Homework");
  if (homeworkSection && homeworkSection.content.trim().endsWith("For")) {
    homeworkSection.content += " Complete a paragraph reflecting on the topic using your own words.";
  }

  return {
    title: "Full Lesson",
    sections: sections.filter(s => sectionsOrder.includes(s.heading)),
  };
}