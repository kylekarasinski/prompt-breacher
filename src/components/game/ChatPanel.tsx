import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Defense, Level } from "@/game/types";
import { askBot } from "@/game/bots/registry";
import { CHAT_CONFIG } from "@/game/config/chat";

type Notice = { kind: "error" | "cooldown" | "repeat"; text: string } | null;
let n = 0;
const uid = () => `m${++n}`;

export function ChatPanel({
  level, defenses, onWin, won,
}: { level: Level; defenses: Defense[]; onWin: (prompt: string) => void; won: boolean }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [cleared, setCleared] = useState(false);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastSent = useRef("");
  const endRef = useRef<HTMLDivElement>(null);

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
    if (cooldown > 0) return setNotice({ kind: "cooldown", text: "Please wait a few seconds before sending again." });
    if (CHAT_CONFIG.blockRepeats && msg === lastSent.current && notice?.kind !== "error")
      return setNotice({ kind: "repeat", text: "That's the same message as last time. Try something different." });

    setNotice(null);
    setWaiting(true);
    const userMsg = { id: uid(), role: "user" as const, text: msg };
    try {
      const reply = await askBot(level, defenses, msgs, msg);
      push([userMsg, { id: uid(), role: "ai", text: reply }]);
      lastSent.current = msg;
      setInput("");
      setCooldown(CHAT_CONFIG.cooldownSeconds);
      if (!won && level.win.kind === "goal" && level.win.check(reply, msg)) onWin(msg);
    } catch {
      setNotice({ kind: "error", text: "Could not reach the bot. Your message is still in the box." });
    } finally {
      setWaiting(false);
    }
  };

  return (
    <section className="panel flex min-h-[420px] flex-col p-4">
      <p className="label">Chat</p>
      <div className="mt-3 flex max-h-[55vh] flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {cleared && <p className="text-center text-xs text-muted-foreground">— older messages were cleared —</p>}
        {msgs.length === 0 && !waiting && (
          <div className="m-auto text-center">
            <p className="text-sm text-muted-foreground">Say something to the bot to begin</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {level.starters?.map((s) => (
                <button key={s} className="chip hover:border-primary" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start border bg-secondary"}`}>
            <b className="mr-1 opacity-70">{m.role === "user" ? "User:" : "AI:"}</b>{m.text}
          </div>
        ))}
        {waiting && <div className="self-start rounded-md border bg-secondary px-3 py-2 text-sm"><b className="opacity-70">AI:</b> <span className="animate-pulse">● ● ●</span></div>}
        <div ref={endRef} />
      </div>
      {notice && (
        <div className={`mt-3 flex items-center gap-2 rounded border p-2 text-xs ${notice.kind === "error" ? "border-destructive text-destructive" : "border-warning text-warning"}`}>
          <span className="flex-1">{notice.text}</span>
          {notice.kind === "error" && <button className="underline" onClick={() => send()}>Retry</button>}
        </div>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="field" placeholder="Type a message" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} />
        <button className="btn-primary min-w-[88px]" disabled={waiting || cooldown > 0 || !input.trim()}>
          {cooldown > 0 ? `Wait ${cooldown}s` : "Send"}
        </button>
      </form>
    </section>
  );
}
