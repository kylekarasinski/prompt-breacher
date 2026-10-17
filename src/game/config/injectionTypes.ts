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
];
