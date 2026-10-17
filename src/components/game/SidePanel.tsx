import { useState } from "react";
import { X } from "lucide-react";
import type { Defense, Level } from "@/game/types";
import { buildSystemPrompt } from "@/game/bots/registry";

export function SidePanel({
  level, defenses, onWin, onClose,
}: { level: Level; defenses: Defense[]; onWin: (p: string) => void; onClose: () => void }) {
  const [hint, setHint] = useState<number | null>(null);
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (level.win.kind !== "passcode" || !guess.trim()) return;
    if (guess.trim().toUpperCase() === level.win.passcode.toUpperCase()) {
      setWrong(false);
      onWin(`Passcode: ${guess.trim()}`);
    } else setWrong(true);
  };

  return (
    <aside className="panel space-y-5 p-4">
      <div className="flex items-center justify-between">
        <p className="label text-foreground">Bot prompt and hints</p>
        <button aria-label="Close panel" className="btn-ghost p-1" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div>
        <p className="label">Bot prompt / instructions / memory</p>
        <pre className="mt-2 whitespace-pre-wrap rounded border bg-background p-3 text-xs text-accent">
          {buildSystemPrompt(level, defenses, true)}
        </pre>
      </div>
      <div>
        <p className="label">Hints (free)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {level.hints.map((_, i) => (
            <button key={i} onClick={() => setHint(i)} className={`chip px-3 py-1 ${hint === i ? "border-primary text-primary" : ""}`}>
              Hint {i + 1}
            </button>
          ))}
        </div>
        {hint !== null && <p className="mt-2 text-sm">{level.hints[hint]}</p>}
      </div>
      {level.win.kind === "passcode" && (
        <div>
          <p className="label">Passcode</p>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <input className={`field uppercase ${wrong ? "border-destructive" : ""}`} value={guess} onChange={(e) => { setGuess(e.target.value); setWrong(false); }} />
            <button className="btn-primary">ENTER</button>
          </form>
          {wrong && <p className="mt-2 text-xs text-destructive">✕ Incorrect passcode</p>}
        </div>
      )}
    </aside>
  );
}
