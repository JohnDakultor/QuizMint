"use client";

import { useEffect } from "react";
import { driver, DriverStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourProps {
  steps: DriverStep[];
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
  const startTour = () => {
    const tour = driver({
      showProgress: true,
      allowClose: true,
      popoverClass: popoverClassName,
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
