import { useState } from "react";
import { X } from "lucide-react";
import type { PublicLevel } from "@/game/types";
import { checkPasscode } from "@/game/game.functions";
import { MAX_INPUT_LENGTH } from "@/game/api";

export function SidePanel({
  level,
  onWin,
  onClose,
}: {
  level: PublicLevel;
  onWin: (p: string) => void;
  onClose: () => void;
}) {
  const [hint, setHint] = useState<number | null>(null);
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);

  const [checking, setChecking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const submit = async () => {
    if (level.winKind !== "passcode" || !guess.trim() || checking) return;
    setChecking(true);
    setUnavailable(false);
    setWrong(false);
    try {
      const result = await checkPasscode({ data: { levelId: level.id, guess } });
      if ("error" in result) setUnavailable(true);
      else if (result.correct) onWin(`Passcode: ${guess.trim()}`);
      else setWrong(true);
    } catch {
      setUnavailable(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <aside id="side-panel" aria-labelledby="side-panel-heading" className="panel space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h2 id="side-panel-heading" className="label text-foreground">
          Bot prompt and hints
        </h2>
        <button
          type="button"
          aria-label="Close panel"
          aria-expanded={true}
          aria-controls="side-panel"
          className="btn-ghost p-1"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <p className="label">Bot prompt / instructions / memory</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded border bg-background p-3 text-xs text-accent">
          {level.displayPrompt}
        </pre>
      </div>
      <div>
        <p className="label">Hints (free)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {level.hints.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={hint === i}
              onClick={() => setHint(i)}
              className={`chip px-3 py-1 ${hint === i ? "border-primary text-primary" : ""}`}
            >
              Hint {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm" aria-live="polite">
          {hint !== null && level.hints[hint]}
        </p>
      </div>
      {level.winKind === "passcode" && (
        <div>
          <label htmlFor="passcode" className="label">
            Passcode
          </label>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              id="passcode"
              autoComplete="off"
              aria-invalid={wrong}
              aria-describedby={wrong ? "passcode-error" : undefined}
              className={`field uppercase ${wrong ? "border-destructive" : ""}`}
              value={guess}
              maxLength={MAX_INPUT_LENGTH}
              readOnly={checking}
              onChange={(e) => {
                setGuess(e.target.value);
                setWrong(false);
                setUnavailable(false);
              }}
            />
            <button className="btn-primary" disabled={checking}>
              ENTER
            </button>
          </form>
          {unavailable && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              Could not check the passcode. Try again.
            </p>
          )}
          {wrong && (
            <p id="passcode-error" role="alert" className="mt-2 text-xs text-destructive">
              ✕ Incorrect passcode
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
