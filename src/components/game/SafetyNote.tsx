import { TriangleAlert } from "lucide-react";

export const INTRO_TEXT =
  "AI chatbots follow instructions they're given. Prompt injection is when someone writes a message that tricks the AI into ignoring those instructions. In this game you'll try it on bots with different defenses, then learn how developers protect against it.";

export function SafetyNote() {
  return (
    <div className="mt-4 flex gap-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
      <TriangleAlert className="h-5 w-5 shrink-0" />
      <p>
        The content discussed in this project is for educational purposes <b>ONLY</b>. Do not use these
        against systems, but learn the methods to counter them in your programs!
      </p>
    </div>
  );
}
