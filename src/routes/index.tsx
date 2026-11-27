import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SafetyNote, INTRO_TEXT } from "@/components/game/SafetyNote";
import { useProgress } from "@/game/progress";
import { GAME_NAME } from "@/game/config/chat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${GAME_NAME} — Learn prompt injection` },
      {
        name: "description",
        content: "An educational game: trick AI bots, then learn how to defend them.",
      },
      { property: "og:title", content: `${GAME_NAME} — Learn prompt injection` },
      { property: "og:description", content: "Trick AI bots, then learn how to defend them." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { accept } = useProgress();
  const nav = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="panel panel-glow w-full max-w-xl p-6 sm:p-10">
        <p className="label">&gt; welcome</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl cursor-blink">
          What is prompt injection?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{INTRO_TEXT}</p>
        <SafetyNote />
        <button
          className="btn-primary mt-6 w-full sm:w-auto"
          onClick={() => {
            accept();
            nav({ to: "/levels" });
          }}
        >
          I understand, let's play
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Only try this here, never on real systems.
        </p>
      </div>
    </main>
  );
}
