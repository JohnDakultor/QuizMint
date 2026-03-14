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
  liteMode: boolean;
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
    liteMode,
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
    <Card className="shadow-xl border-2 border-gray-200 overflow-hidden w-full lg:flex-1 h-137.5 flex flex-col">
      <div className="relative bg-linear-to-r from-blue-600 to-purple-600 p-4">
        <h2 className="text-xl font-bold text-white text-center inline-flex items-center justify-center gap-2 w-full">
          <Sparkles className="h-5 w-5" />
          Create Quiz Input
        </h2>
        <p className="text-sm text-blue-100 text-center mt-1">
          Paste text or links, write instructions, or upload a document.
        </p>
      </div>

      <CardContent className="space-y-2.5 flex flex-col p-4 flex-1">
        <div className="relative">
          <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-1.5 py-1 shadow-xs">
            <label htmlFor="quiz-item-count" className="text-[10px] font-medium text-zinc-600">
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
              className="w-10 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-[11px] font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <textarea
            id="quiz-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="premium-scrollbar h-36 w-full rounded-lg border-2 border-zinc-300 bg-white p-4 pt-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none lg:h-40"
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

        <div id="quiz-upload" className="flex items-center gap-2">
          <FileUpload
            onFileSelect={(file) => {
              if (!user || user.subscriptionPlan !== "premium") {
                onShowSubscribe();
                return;
              }
              setUploadedFile(file);
            }}
          />
          {uploadedFile && (
            <span className="text-xs text-zinc-600 truncate max-w-[220px]">{uploadedFile.name}</span>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <Button
            id="quiz-generate"
            className="flex-1 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <PauseCircle className="mr-1 h-4 w-4" />
              Pause
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button id="quiz-copy-template-link" size="sm" variant="outline" onClick={onCopyTemplateLink}>
            <Copy className="w-4 h-4 mr-1" /> Copy Template
          </Button>
          <Button id="quiz-share-template-link" size="sm" variant="outline" onClick={onShareTemplateLink}>
            <Share2 className="w-4 h-4 mr-1" /> Share Template
          </Button>
        </div>

        {loading && <LoadingProgress label="Generating quiz..." percent={quizProgress} />}

        {infoMessage && (
          <Alert className="border-blue-300 bg-blue-50 text-blue-900">
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

        {adUnlockInfo && !liteMode && (
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
