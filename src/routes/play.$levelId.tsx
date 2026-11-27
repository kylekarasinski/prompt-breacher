import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, X, Check, PanelRight } from "lucide-react";
import { TopBar } from "@/components/game/TopBar";
import { ChatPanel } from "@/components/game/ChatPanel";
import { SidePanel } from "@/components/game/SidePanel";
import { WinDialog } from "@/components/game/WinDialog";
import { getLevel, defensesFor } from "@/game/levels";
import { DIFFICULTIES } from "@/game/config/difficulties";
import { useProgress } from "@/game/progress";
import { clearChat } from "@/game/chatHistory";

export const Route = createFileRoute("/play/$levelId")({
  loader: ({ params }) => {
    if (!getLevel(params.levelId)) throw notFound();
    return { id: params.levelId };
  },
  head: ({ loaderData }) => {
    const l = loaderData ? getLevel(loaderData.id) : undefined;
    const t = `${l?.name ?? "Level"} — PROMPT//BREACH`;
    return {
      meta: [
        { title: t },
        { name: "description", content: l?.description ?? "Prompt injection level" },
        { property: "og:title", content: t },
        { property: "og:description", content: l?.description ?? "Prompt injection level" },
      ],
    };
  },
  component: Play,
});

function Play() {
  const { id } = Route.useLoaderData();
  const level = getLevel(id)!;
  const defenses = defensesFor(level);
  const { completed, complete } = useProgress();
  const [won, setWon] = useState<string | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [drawer, setDrawer] = useState(true);
  const [round, setRound] = useState(0);
  const diff = DIFFICULTIES.find((d) => d.id === level.difficultyId)?.label;

  const onWin = (prompt: string) => {
    setWon(prompt);
    setShowWin(true);
    complete(level.id);
  };

  return (
    <>
      <TopBar completed={completed.length} back />
      <main key={`${id}-${round}`} className="mx-auto max-w-6xl space-y-4 p-4">
        <section className="panel p-4">
          <div className="flex items-start gap-2">
            <h1 className="flex-1 text-2xl font-bold">{level.name}</h1>
            <button
              className="btn-ghost p-2 lg:hidden"
              aria-label={drawer ? "Hide bot prompt and hints" : "Show bot prompt and hints"}
              aria-expanded={drawer}
              aria-controls="side-panel"
              onClick={() => setDrawer(!drawer)}
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <span className="chip border-accent text-accent">{level.gimmick}</span>
            <span className="chip">{diff}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{level.description}</p>
          {defenses.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="label">Defenses in play</span>
              {defenses.map((d, i) => (
                <span key={d!.id} className="chip border-primary/50" title={d!.description}>
                  <Shield className="h-3 w-3" />
                  {d!.name}
                  {i === defenses.length - 1 && <b className="text-warning">NEW</b>}
                </span>
              ))}
            </div>
          )}
        </section>

        <section
          className={`panel flex items-center gap-3 p-4 ${won ? "border-success panel-glow" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${won ? "border-success text-success" : "border-destructive text-destructive"}`}
          >
            {won ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </span>
          <span className="label">Goal</span>
          <span className="font-semibold">{level.goal}</span>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <ChatPanel level={level} defenses={defenses as never} onWin={onWin} won={!!won} />
          {drawer && (
            <SidePanel
              level={level}
              defenses={defenses as never}
              onWin={onWin}
              onClose={() => setDrawer(false)}
            />
          )}
        </div>
        {!drawer && (
          <button
            className="btn-ghost hidden lg:inline-flex"
            aria-expanded={false}
            aria-controls="side-panel"
            onClick={() => setDrawer(true)}
          >
            Show bot prompt and hints
          </button>
        )}
      </main>
      {showWin && won && (
        <WinDialog
          level={level}
          winningPrompt={won}
          onReplay={() => {
            clearChat(level.id);
            setWon(null);
            setShowWin(false);
            setRound((r) => r + 1);
          }}
          onClose={() => setShowWin(false)}
        />
      )}
    </>
  );
}
