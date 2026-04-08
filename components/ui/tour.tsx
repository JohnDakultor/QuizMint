"use client";

import { useEffect } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourProps {
  steps: DriveStep[];
  tourId: string;
  autoStart?: boolean;
  autoStartDelayMs?: number;
  popoverClassName?: string;
}

export default function Tour({
  steps,
  tourId,
  autoStart = true,
  autoStartDelayMs = 700,
  popoverClassName = "quizmint-tour",
}: TourProps) {
  const syncQuizInputToolsVisibility = (step: DriveStep | undefined) => {
    const target = typeof step?.element === "string" ? step.element : "";
    const shouldOpen =
      target === "#quiz-input-tools-toggle" ||
      target === "#quiz-copy-template-link" ||
      target === "#quiz-share-template-link" ||
      target === "#quiz-upload-local" ||
      target === "#quiz-upload-drive";
    window.dispatchEvent(
      new CustomEvent("quiz-input-tools-visibility", {
        detail: { open: shouldOpen },
      })
    );
  };

  const syncQuizAdaptiveVisibility = (step: DriveStep | undefined) => {
    const target = typeof step?.element === "string" ? step.element : "";
    const shouldOpen =
      target === "#quiz-adaptive-toggle" || target === "#quiz-adaptive-context";
    window.dispatchEvent(
      new CustomEvent("quiz-adaptive-visibility", {
        detail: { open: shouldOpen },
      })
    );
  };

  const syncQuizGamifiedVisibility = (step: DriveStep | undefined) => {
    const target = typeof step?.element === "string" ? step.element : "";
    const shouldOpen = target === "#quiz-gamified-mode";
    window.dispatchEvent(
      new CustomEvent("quiz-gamified-visibility", {
        detail: { open: shouldOpen },
      })
    );
  };

  const startTour = () => {
    const tour = driver({
      showProgress: true,
      allowClose: true,
      popoverClass: popoverClassName,
      onHighlightStarted: (_element, step) => {
        syncQuizInputToolsVisibility(step as DriveStep | undefined);
        syncQuizAdaptiveVisibility(step as DriveStep | undefined);
        syncQuizGamifiedVisibility(step as DriveStep | undefined);
      },
      onDestroyed: () => {
        window.dispatchEvent(
          new CustomEvent("quiz-input-tools-visibility", {
            detail: { open: false },
          })
        );
        window.dispatchEvent(
          new CustomEvent("quiz-adaptive-visibility", {
            detail: { open: false },
          })
        );
        window.dispatchEvent(
          new CustomEvent("quiz-gamified-visibility", {
            detail: { open: false },
          })
        );
      },
      steps,
    });
    tour.drive();
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>;
      if (custom.detail?.id && custom.detail.id !== tourId) return;
      startTour();
    };
    window.addEventListener("start-tour", handler as EventListener);
    return () =>
      window.removeEventListener("start-tour", handler as EventListener);
  }, [tourId, steps]);

  useEffect(() => {
    if (!autoStart) return;
    const key = `has-seen-tour:${tourId}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const timer = setTimeout(() => {
        startTour();
        localStorage.setItem(key, "true");
      }, autoStartDelayMs);
      return () => clearTimeout(timer);
    }
  }, [tourId, autoStart, autoStartDelayMs, steps]);

  return null;
}
