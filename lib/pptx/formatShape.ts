export function getShapeCornerRadius(kind: "card" | "chip" | "panel") {
  switch (kind) {
    case "chip":
      return 18;
    case "panel":
      return 28;
    default:
      return 18;
  }
}

export function getShapeStroke(selected: boolean) {
  return {
    stroke: selected ? "#2563eb" : "rgba(0,0,0,0)",
    strokeWidth: selected ? 2 : 0,
    dash: selected ? [8, 6] : [],
  };
}
