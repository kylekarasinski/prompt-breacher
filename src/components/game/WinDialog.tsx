import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PublicLevel } from "@/game/types";
import { useDialog } from "@/hooks/use-dialog";

export function WinDialog({
  level,
  next,
  winningPrompt,
  onReplay,
  onClose,
}: {
  level: PublicLevel;
  next: PublicLevel | undefined;
  winningPrompt: string;
  onReplay: () => void;
  onClose: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(true);
  const e = level.explanation;
  const defense = level.taughtDefense;
  const ref = useDialog<HTMLDivElement>(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="win-title"
        className="panel panel-glow max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none border-success p-6 sm:rounded-lg"
        onClick={(ev) => ev.stopPropagation()}
      >
        <p className="label text-success">Level complete</p>
        <h2 id="win-title" className="text-3xl font-bold text-success">
          Goal reached
        </h2>

        <Block title="Why it worked" tag={e.technique} body={e.whyItWorked} />
        <Block title="How to defend against it" tag={defense.name} body={e.howToDefend} />

        <p className="label mt-5">Your winning prompt</p>
        <p className="mt-1 whitespace-pre-wrap break-words rounded border bg-background p-3 text-sm">
          {winningPrompt}
        </p>

        <button
          type="button"
          aria-expanded={showPrompt}
          className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          {showPrompt ? "Hide" : "Show"} the bot's prompt{" "}
          {showPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showPrompt && (
          <>
            <pre className="mt-2 whitespace-pre-wrap rounded border bg-background p-3 text-xs text-accent">
              {level.displayPrompt}
            </pre>
            <p className="mt-1 text-xs text-muted-foreground">
              The password is hidden so the level can still be replayed.
            </p>
          </>
        )}

        <p className="mt-4 rounded border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
          {next ? (
            <>
              Next level adds this defense: <b>{defense.name}</b>. Try to beat it.
            </>
          ) : (
            <>
              Future levels of this type will add: <b>{defense.name}</b>.
            </>
          )}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {next ? (
            <Link to="/play/$levelId" params={{ levelId: next.id }} className="btn-primary">
              Next level
            </Link>
          ) : (
            <button className="btn-primary" disabled>
              Next level (soon)
            </button>
          )}
          <button className="btn-ghost" onClick={onReplay}>
            Replay level
          </button>
          <Link to="/levels" className="btn-ghost">
            Level select
          </Link>
        </div>
      </div>
    </div>
  );
}

function Block({ title, tag, body }: { title: string; tag: string; body: string }) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="label">{title}</p>
        <span className="chip border-primary text-primary">{tag}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
