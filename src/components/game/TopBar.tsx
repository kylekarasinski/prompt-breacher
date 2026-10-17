import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Info } from "lucide-react";
import { GAME_NAME } from "@/game/config/chat";
import { LEVELS } from "@/game/levels";
import { AboutDialog } from "./AboutDialog";

export function TopBar({ completed, back }: { completed: number; back?: boolean }) {
  const [about, setAbout] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {back && (
          <Link to="/levels" className="btn-ghost px-2 py-1 text-xs">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Level select</span>
          </Link>
        )}
        <span className="font-bold tracking-wider text-primary">{GAME_NAME}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {completed} / {LEVELS.length} <span className="hidden sm:inline">complete</span>
        </span>
        <button aria-label="About" onClick={() => setAbout(true)} className="btn-ghost p-2">
          <Info className="h-4 w-4" />
        </button>
      </div>
      {about && <AboutDialog onClose={() => setAbout(false)} />}
    </header>
  );
}
