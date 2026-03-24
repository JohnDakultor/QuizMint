"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import LoadingProgress from "@/components/ui/loading-progress";
import AdUnlockButton from "@/components/ad-unlock-button";
import { ArrowRight, Copy, PauseCircle, Share2, Sparkles } from "lucide-react";

type AdUnlockInfo = {
  available: boolean;
  nextAdResetAt?: string | null;
  nextFreeAt?: string | null;
  remaining?: number;
} | null;

type UserLike = {
  subscriptionPlan?: string | null;
};

type QuizInputCardProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  numberOfItems: number;
  setNumberOfItems: (value: number) => void;
  user: UserLike | null;
  loading: boolean;
  quizProgress: number;
  infoMessage: string;
  error: string;
  adUnlockInfo: AdUnlockInfo;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  onPaste: () => void;
  onGenerate: () => void;
  onPause: () => void;
  onCopyTemplateLink: () => void;
  onShareTemplateLink: () => void;
  onShowSubscribe: () => void;
  onAdUnlocked: () => void;
};

export function QuizInputCard(props: QuizInputCardProps) {
  const {
    prompt,
    setPrompt,
    numberOfItems,
    setNumberOfItems,
    user,
    loading,
    quizProgress,
    infoMessage,
    error,
    adUnlockInfo,
    uploadedFile,
    setUploadedFile,
    onPaste,
    onGenerate,
    onPause,
    onCopyTemplateLink,
    onShareTemplateLink,
    onShowSubscribe,
    onAdUnlocked,
  } = props;

  return (
    <Card className="h-137.5 w-full overflow-hidden border border-indigo-200/80 bg-linear-to-b from-white to-indigo-50/40 shadow-[0_24px_60px_-24px_rgba(30,64,175,0.45)] lg:flex-1 flex flex-col dark:border-indigo-400/25 dark:from-slate-950/80 dark:to-indigo-950/45 dark:shadow-[0_24px_60px_-24px_rgba(30,64,175,0.75)]">
      <div className="relative bg-linear-to-r from-blue-600 to-purple-600 p-4">
        <h2 className="text-xl font-bold text-white text-center inline-flex items-center justify-center gap-2 w-full">
          <Sparkles className="h-5 w-5" />
          Create Quiz Input
        </h2>
        <p className="text-sm text-blue-100 text-center mt-1">
          Paste text or links, write instructions, or upload a document.
        </p>
      </div>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 p-4">
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          <div className="relative min-w-0">
            <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded border border-zinc-300 bg-white/95 px-1.5 py-1 shadow-xs dark:border-slate-500/70 dark:bg-slate-900/80">
              <label htmlFor="quiz-item-count" className="text-[10px] font-medium text-zinc-600 dark:text-slate-300">
                #
              </label>
                <input
                  id="quiz-item-count"
                  type="number"
                min={1}
                max={50}
                value={numberOfItems}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  setNumberOfItems(Math.min(50, Math.max(1, Math.floor(next))));
                }}
                  className="w-10 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-[11px] font-medium text-zinc-900 outline-none dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <textarea
                id="quiz-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="premium-scrollbar h-32 w-full rounded-lg border-2 border-zinc-300 bg-white p-4 pt-10 text-sm text-zinc-900 resize-none focus:outline-none lg:h-36 dark:border-indigo-200/70 dark:bg-slate-900/65 dark:text-slate-100"
              />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={onPaste}>
                Paste
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPrompt("")}>
                Clear
              </Button>
            </div>
          </div>

        </div>

        <div className="mt-auto space-y-2">
          {(loading || infoMessage || error) && (
            <div className="space-y-2">
              {loading && <LoadingProgress label="Generating quiz..." percent={quizProgress} />}

              {infoMessage && (
                <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:border-sky-500/50 dark:bg-sky-950/40 dark:text-sky-100">
                  <AlertDescription>{infoMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>{error}</div>
                      {adUnlockInfo?.nextFreeAt && (
                        <div className="text-sm text-muted-foreground">
                          Free limit resets at {new Date(adUnlockInfo.nextFreeAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              id="quiz-generate"
              className="h-14 flex-1 rounded-xl bg-blue-600 text-lg font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:opacity-75"
              onClick={onGenerate}
              disabled={loading}
            >
              {loading ? "Generating Quiz..." : "Generate Quiz"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {loading && (
              <Button
                type="button"
                variant="outline"
                onClick={onPause}
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-400/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                <PauseCircle className="mr-1 h-4 w-4" />
                Pause
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button id="quiz-copy-template-link" size="sm" variant="outline" onClick={onCopyTemplateLink} className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-slate-500/70 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800">
              <Copy className="w-4 h-4 mr-1" /> Copy Template
            </Button>
            <Button id="quiz-share-template-link" size="sm" variant="outline" onClick={onShareTemplateLink} className="border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-slate-500/70 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800">
              <Share2 className="w-4 h-4 mr-1" /> Share Template
            </Button>
            <FileUpload
              onFileSelect={(file) => {
                if (!user || user.subscriptionPlan !== "premium") {
                  onShowSubscribe();
                  return;
                }
                setUploadedFile(file);
              }}
            />
          </div>
          {uploadedFile && <div className="truncate text-xs text-zinc-600 dark:text-slate-300">File: {uploadedFile.name}</div>}
        </div>

        {adUnlockInfo && (
          <AdUnlockButton
            cooldownUntil={adUnlockInfo.nextAdResetAt || adUnlockInfo.nextFreeAt}
            remaining={adUnlockInfo.remaining}
            onUnlocked={onAdUnlocked}
          />
        )}
      </CardContent>
    </Card>
  );
}
