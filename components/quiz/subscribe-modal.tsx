"use client";

import { Button } from "@/components/ui/button";

type SubscribeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubscribe: () => void;
};

export function QuizSubscribeModal({ open, onClose, onSubscribe }: SubscribeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-lg w-80 text-center">
        <h2 className="text-xl font-bold mb-3">Subscription Required</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
          Uploading files is available only for premium members.
        </p>
        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={onSubscribe}>
          Subscribe Now
        </Button>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

