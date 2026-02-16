"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PptDeck, PptSlide } from "@/lib/lesson-plan-ppt-ai";

type Props = {
  deck: PptDeck;
  onChange: (deck: PptDeck) => void;
  onDownload: () => void;
  loading?: boolean;
};

function updateSlide(
  deck: PptDeck,
  index: number,
  patch: Partial<PptSlide>
): PptDeck {
  const slides = deck.slides.map((s, i) =>
    i === index ? { ...s, ...patch } : s
  );
  return { ...deck, slides };
}

export default function PptxEditor({ deck, onChange, onDownload, loading }: Props) {
  const slideCount = deck.slides.length;

  const header = useMemo(() => {
    return deck.subtitle ? `${deck.title} • ${deck.subtitle}` : deck.title;
  }, [deck.subtitle, deck.title]);

  return (
    <div className="mt-8 border-2 border-blue-200 rounded-2xl p-6 bg-white shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-blue-800">Edit PPTX Slides</h3>
          <p className="text-sm text-gray-600">{header}</p>
          <p className="text-xs text-gray-500 mt-1">
            {slideCount} slides • edit content before download
          </p>
        </div>
        <Button onClick={onDownload} disabled={loading}>
          {loading ? "Generating PPTX..." : "Download Edited PPTX"}
        </Button>
      </div>

      <div className="space-y-8">
        {deck.slides.map((slide, idx) => (
          <div
            key={`${slide.title}-${idx}`}
            className="border rounded-xl p-4 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">
                Slide {idx + 1}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Title
                </label>
                <Input
                  value={slide.title}
                  onChange={(e) =>
                    onChange(updateSlide(deck, idx, { title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Body
                </label>
                <Textarea
                  value={slide.body || ""}
                  onChange={(e) =>
                    onChange(updateSlide(deck, idx, { body: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bullets (one per line)
                </label>
                <Textarea
                  value={(slide.bullets || []).join("\n")}
                  onChange={(e) =>
                    onChange(
                      updateSlide(deck, idx, {
                        bullets: e.target.value
                          .split("\n")
                          .map((b) => b.trim())
                          .filter(Boolean),
                      })
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Image Prompt (optional)
                </label>
                <Textarea
                  value={slide.imagePrompt || ""}
                  onChange={(e) =>
                    onChange(
                      updateSlide(deck, idx, { imagePrompt: e.target.value })
                    )
                  }
                  placeholder="Describe the image you want on this slide"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Speaker Notes (optional)
                </label>
                <Textarea
                  value={slide.notes || ""}
                  onChange={(e) =>
                    onChange(updateSlide(deck, idx, { notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
