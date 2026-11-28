import { createServerFn } from "@tanstack/react-start";
import type { CheckPasscodeInput, SendChatInput } from "./api";
import { publicCatalog } from "./server/catalog";
import { runChat, runPasscodeCheck } from "./server/gameplay";

// The typed inputs are checked at runtime by the gameplay handlers.
export const sendChat = createServerFn({ method: "POST" })
  .validator((input: SendChatInput) => input)
  .handler(({ data }) => runChat(data));

export const checkPasscode = createServerFn({ method: "POST" })
  .validator((input: CheckPasscodeInput) => input)
  .handler(({ data }) => runPasscodeCheck(data));

export const getLevelCatalog = createServerFn({ method: "GET" }).handler(() => publicCatalog);
