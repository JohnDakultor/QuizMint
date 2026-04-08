"use client";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function printElementContent(element: HTMLElement | null, title: string) {
  if (!element || typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) return false;

  const copiedStyles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  ).map((node) => node.cloneNode(true) as HTMLElement);

  const { document: printDocument } = printWindow;
  printDocument.open();
  printDocument.write("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /></head><body></body></html>");
  printDocument.close();

  printDocument.title = title;

  copiedStyles.forEach((node) => {
    printDocument.head.appendChild(node);
  });

  const inlineStyle = printDocument.createElement("style");
  inlineStyle.textContent = `
    body {
      margin: 0;
      padding: 24px;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, sans-serif;
    }
    .print-shell {
      max-width: 900px;
      margin: 0 auto;
    }
    .print-hidden {
      display: none !important;
    }
    @page {
      margin: 16mm;
    }
  `;
  printDocument.head.appendChild(inlineStyle);

  const shell = printDocument.createElement("div");
  shell.className = "print-shell";
  shell.innerHTML = element.outerHTML;
  printDocument.body.appendChild(shell);

  printWindow.focus();
  printWindow.requestAnimationFrame(() => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  });
  return true;
}
