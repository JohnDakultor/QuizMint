"use client";

import type { ReactNode } from "react";

type Props = {
  children: string;
  inline?: boolean;
  className?: string;
};

type Segment = {
  text: string;
  math: boolean;
  block?: boolean;
};

function readGroup(input: string, start: number) {
  const open = input[start];
  const close = open === "{" ? "}" : open === "(" ? ")" : "";
  if (!close) return null;

  let depth = 0;
  for (let i = start; i < input.length; i++) {
    if (input[i] === open) depth += 1;
    if (input[i] === close) depth -= 1;
    if (depth === 0) {
      return {
        value: input.slice(start + 1, i),
        end: i + 1,
      };
    }
  }
  return null;
}

function readScript(input: string, start: number) {
  if (input[start] === "{") {
    const group = readGroup(input, start);
    if (group) return group;
  }
  return {
    value: input[start] || "",
    end: Math.min(start + 1, input.length),
  };
}

function renderMathExpression(input: string, keyPrefix = "m"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    nodes.push(<span key={`${keyPrefix}-t-${nodes.length}`}>{normalizeMathText(buffer)}</span>);
    buffer = "";
  };

  for (let i = 0; i < input.length; i++) {
    if (input.startsWith("\\frac", i)) {
      const numerator = readGroup(input, i + 5);
      const denominator = numerator ? readGroup(input, numerator.end) : null;
      if (numerator && denominator) {
        flush();
        nodes.push(
          <span key={`${keyPrefix}-f-${nodes.length}`} className="qm-fraction">
            <span className="qm-fraction-top">{renderMathExpression(numerator.value, `${keyPrefix}-fn-${i}`)}</span>
            <span className="qm-fraction-bottom">{renderMathExpression(denominator.value, `${keyPrefix}-fd-${i}`)}</span>
          </span>
        );
        i = denominator.end - 1;
        continue;
      }
    }

    if (input.startsWith("\\sqrt", i)) {
      const radicand = readGroup(input, i + 5);
      if (radicand) {
        flush();
        nodes.push(
          <span key={`${keyPrefix}-sqrt-${nodes.length}`} className="qm-sqrt">
            <span className="qm-sqrt-symbol">√</span>
            <span className="qm-sqrt-radicand">
              {renderMathExpression(radicand.value, `${keyPrefix}-sr-${i}`)}
            </span>
          </span>
        );
        i = radicand.end - 1;
        continue;
      }
    }

    if (input[i] === "^" || input[i] === "_") {
      const script = readScript(input, i + 1);
      if (script.value) {
        flush();
        const Tag = input[i] === "^" ? "sup" : "sub";
        nodes.push(
          <Tag key={`${keyPrefix}-s-${nodes.length}`}>
            {renderMathExpression(script.value, `${keyPrefix}-sx-${i}`)}
          </Tag>
        );
        i = script.end - 1;
        continue;
      }
    }

    if (input[i] === "\\") {
      const commandMatch = input.slice(i).match(/^\\[a-zA-Z]+/);
      if (commandMatch) {
        buffer += latexCommandToText(commandMatch[0]);
        i += commandMatch[0].length - 1;
        continue;
      }
      buffer += input[i + 1] || "";
      i += 1;
      continue;
    }

    buffer += input[i];
  }

  flush();
  return nodes;
}

function latexCommandToText(command: string) {
  const map: Record<string, string> = {
    "\\cdot": "·",
    "\\div": "÷",
    "\\ge": "≥",
    "\\geq": "≥",
    "\\le": "≤",
    "\\leq": "≤",
    "\\neq": "≠",
    "\\ne": "≠",
    "\\pm": "±",
    "\\times": "×",
    "\\pi": "π",
    "\\theta": "θ",
    "\\alpha": "α",
    "\\beta": "β",
    "\\Delta": "Δ",
  };
  return map[command] || command.replace(/^\\/, "");
}

function normalizeMathText(input: string) {
  return input
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\*/g, "×")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/!=/g, "≠");
}

function shouldTreatDollarAsMath(value: string) {
  return /\\[a-zA-Z]+|[=^_{}]|[+\-*/]|[<>]|[0-9]\s*[a-zA-Z]/.test(value);
}

function splitMathSegments(text: string): Segment[] {
  const source = String(text || "");
  const segments: Segment[] = [];
  let cursor = 0;

  const pushText = (end: number) => {
    if (end > cursor) segments.push({ text: source.slice(cursor, end), math: false });
  };

  while (cursor < source.length) {
    const candidates = [
      { index: source.indexOf("$$", cursor), open: "$$", close: "$$", block: true },
      { index: source.indexOf("\\[", cursor), open: "\\[", close: "\\]", block: true },
      { index: source.indexOf("\\(", cursor), open: "\\(", close: "\\)", block: false },
      { index: source.indexOf("$", cursor), open: "$", close: "$", block: false },
    ]
      .filter((candidate) => candidate.index >= 0)
      .sort((a, b) => a.index - b.index);

    const next = candidates[0];
    if (!next) break;
    pushText(next.index);

    const contentStart = next.index + next.open.length;
    const closeIndex = source.indexOf(next.close, contentStart);
    if (closeIndex < 0) {
      cursor = next.index;
      break;
    }

    const content = source.slice(contentStart, closeIndex).trim();
    const dollarMath = next.open !== "$" || shouldTreatDollarAsMath(content);
    if (content && dollarMath) {
      segments.push({ text: content, math: true, block: next.block });
      cursor = closeIndex + next.close.length;
    } else {
      segments.push({ text: source.slice(next.index, closeIndex + next.close.length), math: false });
      cursor = closeIndex + next.close.length;
    }
  }

  if (cursor < source.length) segments.push({ text: source.slice(cursor), math: false });
  return segments;
}

export function MathText({ children, inline = false, className = "" }: Props) {
  const segments = splitMathSegments(children);
  const hasBlock = segments.some((segment) => segment.block);
  const Wrapper = inline && !hasBlock ? "span" : "span";

  return (
    <Wrapper className={className}>
      {segments.map((segment, index) =>
        segment.math ? (
          <span
            key={`${index}-${segment.text}`}
            className={segment.block ? "qm-math-block" : "qm-math-inline"}
          >
            {renderMathExpression(segment.text, `seg-${index}`)}
          </span>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        )
      )}
    </Wrapper>
  );
}
