"use client";

import { useEffect, useRef, useState } from "react";

export function useLoadedImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src || typeof window === "undefined") {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
  }, [src]);

  return image;
}

export function useLoadedImageMap(items: Array<{ id: string; src?: string }>) {
  const [imageMap, setImageMap] = useState<Record<string, HTMLImageElement | null>>({});
  const signatureRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      if (Object.keys(imageMap).length > 0) {
        setImageMap({});
      }
      return;
    }

    const signature = items.map((item) => `${item.id}:${item.src || ""}`).join("|");
    if (signatureRef.current === signature) {
      return;
    }
    signatureRef.current = signature;

    const activeIds = new Set(items.map((item) => item.id));
    setImageMap((current) => {
      const next: Record<string, HTMLImageElement | null> = {};
      for (const [key, value] of Object.entries(current)) {
        if (activeIds.has(key)) next[key] = value;
      }
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length) {
        let changed = false;
        for (const key of currentKeys) {
          if (current[key] !== next[key]) {
            changed = true;
            break;
          }
        }
        if (!changed) return current;
      }
      return next;
    });

    const cleanups: Array<() => void> = [];

    items.forEach((item) => {
      if (!item.src) {
        setImageMap((current) => (current[item.id] ? { ...current, [item.id]: null } : current));
        return;
      }

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageMap((current) => ({ ...current, [item.id]: img }));
      };
      img.onerror = () => {
        setImageMap((current) => ({ ...current, [item.id]: null }));
      };
      img.src = item.src;

      cleanups.push(() => {
        img.onload = null;
        img.onerror = null;
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [items]);

  return imageMap;
}
