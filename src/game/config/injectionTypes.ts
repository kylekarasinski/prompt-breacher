import type { InjectionType } from "../types";

/** Add an injection type by adding one entry; it appears on Level Select. */
export const INJECTION_TYPES: InjectionType[] = [
  {
    id: "instruction-override",
    name: "Instruction Override",
    description: "Convince the bot to drop its rules and leak a secret.",
  },
  {
    id: "role-play",
    name: "Role-Play Hijack",
    description: "Wrap a request in a fictional role so the bot does something it shouldn't.",
  },
  {
    id: "prompt-leak",
    name: "Prompt Leak",
    description: "Trick the bot into reading out its own hidden instructions.",
  },
  {
    id: "poisoned-review",
    name: "Poisoned Review",
    description: "Hide instructions inside text the bot is only supposed to read.",
  },
  {
    id: "spell-it-differently",
    name: "Spell It Differently",
    description: "Sneak a banned word past a filter by disguising it.",
  },
  {
    id: "tool-hijack",
    name: "Tool Hijack",
    description: "Get a bot that can take actions to take the wrong one.",
  },
  {
    id: "fake-examples",
    name: "Fake Examples",
    description: "Give the bot a pattern and let it finish it.",
  },
];
