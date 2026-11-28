import { useEffect, useRef, useState } from "react";
import { ShieldAlert, ShieldX } from "lucide-react";
import type { ChatMessage, PublicLevel } from "@/game/types";
import { sendChat } from "@/game/game.functions";
import { CHAT_ERRORS, MAX_HISTORY_ENTRIES, MAX_INPUT_LENGTH, type GameErrorCode } from "@/game/api";
import { CHAT_CONFIG } from "@/game/config/chat";
import { loadChat, saveChat } from "@/game/chatHistory";

type Notice = { kind: "error" | "cooldown" | "repeat"; text: string; retry?: boolean } | null;
// Only transient failures are worth retrying; the rest need a fix elsewhere first.
const RETRYABLE: GameErrorCode[] = ["TIMEOUT", "PROVIDER_DOWN", "INTERNAL_ERROR"];
const RATE_LIMIT_COOLDOWN_SECONDS = 30;
let n = 0;
// Timestamp prefix keeps ids unique against messages restored from a previous page load.
const uid = () => `m${Date.now().toString(36)}-${++n}`;

export function ChatPanel({
  level,
  onWin,
  won,
}: {
  level: PublicLevel;
  onWin: (prompt: string) => void;
  won: boolean;
}) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [cleared, setCleared] = useState(false);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [cooldown, setCooldown] = useState(0);
  // Storage is read after mount (it doesn't exist during SSR); don't save until then,
  // or the initial empty state would overwrite the saved history.
  const [restored, setRestored] = useState(false);
  const lastSent = useRef("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadChat(level.id);
    setMsgs(saved.msgs);
    setCleared(saved.cleared);
    lastSent.current = [...saved.msgs].reverse().find((m) => m.role === "user")?.text ?? "";
    setRestored(true);
  }, [level.id]);
  useEffect(() => {
    if (restored) saveChat(level.id, { msgs, cleared });
  }, [restored, level.id, msgs, cleared]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, waiting]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const push = (m: ChatMessage[]) =>
    setMsgs((prev) => {
      const all = [...prev, ...m];
      if (all.length > CHAT_CONFIG.maxMessages) {
        setCleared(true);
        return all.slice(-CHAT_CONFIG.maxMessages);
      }
      return all;
    });

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg || waiting) return;
    if (cooldown > 0)
      return setNotice({
        kind: "cooldown",
        text: "Please wait a few seconds before sending again.",
      });
    if (CHAT_CONFIG.blockRepeats && msg === lastSent.current && notice?.kind !== "error")
      return setNotice({
        kind: "repeat",
        text: "That's the same message as last time. Try something different.",
      });

    setNotice(null);
    setWaiting(true);
    const userMsg = { id: uid(), role: "user" as const, text: msg };
    try {
      const history = msgs
        .filter((turn) => turn.role !== "system" && turn.text.slice(0, MAX_INPUT_LENGTH).trim())
        .slice(-MAX_HISTORY_ENTRIES)
        .map((turn) => ({
          role: turn.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: turn.text.slice(0, MAX_INPUT_LENGTH),
        }));
      const result = await sendChat({ data: { levelId: level.id, history, message: msg } });
      if ("error" in result) {
        if (result.error === "RATE_LIMITED") {
          setNotice({ kind: "cooldown", text: CHAT_ERRORS.RATE_LIMITED });
          setCooldown(RATE_LIMIT_COOLDOWN_SECONDS);
        } else {
          setNotice({
            kind: "error",
            text: CHAT_ERRORS[result.error],
            retry: RETRYABLE.includes(result.error),
          });
        }
        return;
      }
      const { reply, blockedBy, blockedStage } = result;
      const blocked =
        blockedBy && blockedStage
          ? {
              by: blockedBy,
              name: level.defenses.find((d) => d.id === blockedBy)?.name ?? blockedBy,
              stage: blockedStage,
            }
          : undefined;
      push([userMsg, { id: uid(), role: "ai", text: reply, ...(blocked && { blocked }) }]);
      lastSent.current = msg;
      setInput("");
      setCooldown(CHAT_CONFIG.cooldownSeconds);
      if (!won && level.winKind === "goal" && result.won) onWin(msg);
    } catch {
      setNotice({
        kind: "error",
        text: CHAT_ERRORS.PROVIDER_DOWN,
        retry: true,
      });
    } finally {
      setWaiting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <section className="panel flex min-h-[420px] flex-col p-4" aria-labelledby="chat-heading">
      <h2 id="chat-heading" className="label">
        Chat
      </h2>
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with the bot"
        aria-busy={waiting}
        className="mt-3 flex max-h-[55vh] flex-1 flex-col gap-2 overflow-y-auto pr-1"
      >
        {cleared && (
          <p className="text-center text-xs text-muted-foreground">
            — older messages were cleared —
          </p>
        )}
        {msgs.length === 0 && !waiting && (
          <div className="m-auto text-center">
            <p className="text-sm text-muted-foreground">Say something to the bot to begin</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {level.starters?.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip hover:border-primary"
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) =>
          m.blocked ? (
            <div
              key={m.id}
              className={`flex max-w-[85%] items-start gap-2 self-start rounded-md border px-3 py-2 text-sm ${m.blocked.stage === "input" ? "border-dashed border-warning" : "border-destructive"}`}
            >
              {m.blocked.stage === "input" ? (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              ) : (
                <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <p>
                <b className="block">
                  {m.blocked.stage === "input" ? "Blocked by: " : "Reply blocked by: "}
                  {m.blocked.name}
                </b>
                <span className="block text-xs text-muted-foreground">
                  {m.blocked.stage === "input"
                    ? "Your message never reached the bot."
                    : "The bot answered, but the defense caught its reply before you saw it."}
                </span>
              </p>
            </div>
          ) : (
            <div
              key={m.id}
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm ${m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start border bg-secondary"}`}
            >
              <b className="mr-1 opacity-70">{m.role === "user" ? "User:" : "AI:"}</b>
              {m.text}
            </div>
          ),
        )}
        {waiting && (
          <div className="self-start rounded-md border bg-secondary px-3 py-2 text-sm">
            <b className="opacity-70">AI:</b>{" "}
            <span className="animate-pulse" aria-hidden="true">
              ● ● ●
            </span>
            <span className="sr-only">is typing</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-3 flex items-center gap-2 rounded border p-2 text-xs ${notice.kind === "error" ? "border-destructive text-destructive" : "border-warning text-warning"}`}
        >
          <span className="flex-1">{notice.text}</span>
          {notice.retry && (
            <button type="button" className="underline" onClick={() => send()}>
              Retry
            </button>
          )}
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          ref={inputRef}
          className="field"
          placeholder="Type a message"
          aria-label="Message to the bot"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={MAX_INPUT_LENGTH}
          autoComplete="off"
        />
        <button
          className="btn-primary min-w-[88px] shrink-0"
          disabled={waiting || cooldown > 0 || !input.trim()}
        >
          {cooldown > 0 ? `Wait ${cooldown}s` : "Send"}
        </button>
      </form>
    </section>
  );
}
