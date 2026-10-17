import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { TopBar } from "@/components/game/TopBar";
import { INJECTION_TYPES } from "@/game/config/injectionTypes";
import { DIFFICULTIES } from "@/game/config/difficulties";
import { findLevel } from "@/game/levels";
import { useProgress } from "@/game/progress";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Level select — PROMPT//BREACH" },
      { name: "description", content: "Pick a prompt injection type and difficulty." },
      { property: "og:title", content: "Level select — PROMPT//BREACH" },
      { property: "og:description", content: "Pick a prompt injection type and difficulty." },
    ],
  }),
  component: LevelSelect,
});

const sortedDiffs = [...DIFFICULTIES].sort((a, b) => a.order - b.order);

function LevelSelect() {
  const { completed, accepted, ready } = useProgress();
  const nav = useNavigate();
  useEffect(() => {
    if (ready && !accepted) nav({ to: "/" });
  }, [ready, accepted, nav]);

  return (
    <>
      <TopBar completed={completed.length} />
      <main className="mx-auto max-w-6xl p-4">
        <p className="label">&gt; level select</p>
        <h1 className="mt-1 text-3xl font-bold">Pick an injection type</h1>
        <div className="mt-6 grid gap-4">
          {INJECTION_TYPES.map((t) => (
            <TypeCard key={t.id} typeId={t.id} name={t.name} desc={t.description} completed={completed} />
          ))}
        </div>
      </main>
    </>
  );
}

function TypeCard({ typeId, name, desc, completed }: { typeId: string; name: string; desc: string; completed: string[] }) {
  const firstOpen = sortedDiffs.find((d) => {
    const l = findLevel(typeId, d.id);
    return l && !completed.includes(l.id);
  });
  const [sel, setSel] = useState(firstOpen?.id ?? sortedDiffs[0].id);
  const levels = sortedDiffs.map((d) => findLevel(typeId, d.id)).filter(Boolean);
  const allDone = levels.length > 0 && levels.every((l) => completed.includes(l!.id));
  const selected = findLevel(typeId, sel);

  return (
    <div className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {allDone && <Check className="h-4 w-4 text-success" />}
          <h2 className="text-lg font-semibold">{name}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortedDiffs.map((d) => {
          const l = findLevel(typeId, d.id);
          const done = l && completed.includes(l.id);
          return (
            <button
              key={d.id}
              disabled={!l}
              onClick={() => setSel(d.id)}
              className={`chip px-3 py-1.5 ${sel === d.id ? "border-primary text-primary" : ""} ${done ? "bg-primary/15" : ""}`}
              title={l ? l.name : "Coming soon"}
            >
              {done && <Check className="h-3 w-3" />}
              {d.label}
              {!l && <span className="text-muted-foreground">·soon</span>}
            </button>
          );
        })}
      </div>
      {selected ? (
        <Link to="/play/$levelId" params={{ levelId: selected.id }} className="btn-primary">
          Start
        </Link>
      ) : (
        <button className="btn-ghost" disabled>Start</button>
      )}
    </div>
  );
}
