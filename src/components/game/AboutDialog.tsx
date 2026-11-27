import { X } from "lucide-react";
import { SafetyNote, INTRO_TEXT } from "./SafetyNote";
import { useDialog } from "@/hooks/use-dialog";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="panel panel-glow max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 id="about-title" className="text-2xl font-bold">
            About this game
          </h2>
          <button aria-label="Close" onClick={onClose} className="btn-ghost p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{INTRO_TEXT}</p>
        <SafetyNote />
        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
