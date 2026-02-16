"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AdUnlockButtonProps = {
  cooldownUntil?: string | null;
  disabled?: boolean;
  onUnlocked?: () => void;
  title?: string;
  description?: string;
  timerSeconds?: number;
  remaining?: number;
};

export default function AdUnlockButton({
  cooldownUntil,
  disabled = false,
  onUnlocked,
  title = "Watch Ad To Unlock",
  description = "Watch an ad to reset your free usage immediately.",
  timerSeconds = 30,
  remaining,
}: AdUnlockButtonProps) {
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");

  const cooldownText = useMemo(() => {
    if (!cooldownUntil) return "";
    const date = new Date(cooldownUntil);
    if (Number.isNaN(date.getTime())) return "";
    return `Next ad reset available at ${date.toLocaleTimeString()}`;
  }, [cooldownUntil]);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(timerSeconds);
    setError("");
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(timerSeconds - elapsed, 0);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [open, timerSeconds]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch("/api/quiz-ad-reset", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to unlock.");
      }
      setOpen(false);
      onUnlocked?.();
    } catch (err: any) {
      setError(err.message || "Failed to unlock.");
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore
    }
  }, [open]);


  return (
    <>
      <Button
        variant="outline"
        className="w-full mt-2"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {title}
      </Button>
      {(cooldownText || typeof remaining === "number") && (
        <div className="text-xs text-muted-foreground mt-1">
          {typeof remaining === "number" ? `${remaining} ad resets left` : null}
          {cooldownText ? ` ${cooldownText}` : null}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Watch Ad To Unlock</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-md p-4 bg-muted/40">
            <div className="text-sm text-muted-foreground mb-2">
              Ad will be displayed here. Please keep this window open.
            </div>
            <ins
              className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client="ca-pub-8981480808378326"
              data-ad-slot="1347935059"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {secondsLeft > 0
              ? `Unlock available in ${secondsLeft}s`
              : "You can now unlock your usage."}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <DialogFooter>
            <Button
              onClick={handleUnlock}
              disabled={unlocking || secondsLeft > 0}
            >
              {unlocking ? "Unlocking..." : "Unlock Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
