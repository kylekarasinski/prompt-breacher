import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import type { CheckPasscodeInput, GetPublicLevelInput, SendChatInput } from "./api";
import { findPublicLevel, publicCatalog } from "./server/catalog";
import { runChat, runPasscodeCheck } from "./server/gameplay";
import { chatRateLimiter } from "./server/rateLimit";

// The socket address is preferred; X-Forwarded-For is used only when no socket address exists.
function clientIP() {
  return getRequestIP() ?? getRequestIP({ xForwardedFor: true }) ?? "unknown";
}

// The typed inputs are checked at runtime by the gameplay handlers.
export const sendChat = createServerFn({ method: "POST" })
  .validator((input: SendChatInput) => input)
  .handler(({ data }) =>
    chatRateLimiter.take(clientIP()) ? runChat(data) : { error: "RATE_LIMITED" as const },
  );

export const checkPasscode = createServerFn({ method: "POST" })
  .validator((input: CheckPasscodeInput) => input)
  .handler(({ data }) => runPasscodeCheck(data));

export const getLevelCatalog = createServerFn({ method: "GET" }).handler(() => publicCatalog);

export const getPublicLevel = createServerFn({ method: "GET" })
  .validator((input: GetPublicLevelInput) => input)
  .handler(({ data }) => findPublicLevel(data));
