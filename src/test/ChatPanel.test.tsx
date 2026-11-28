import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "@/components/game/ChatPanel";
import { sendChat } from "@/game/game.functions";
import { CHAT_CONFIG } from "@/game/config/chat";
import { goalLevel, passcodeLevel } from "./fixtures";

// Tests control the gameplay response returned by the server function.
vi.mock("@/game/game.functions", () => ({ sendChat: vi.fn() }));
const sendChatMock = vi.mocked(sendChat);

const defaultCooldown = CHAT_CONFIG.cooldownSeconds;

function renderChat(props: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  const onWin = vi.fn();
  // StrictMode mounts twice in dev, which is when a premature save could wipe restored history.
  render(
    <StrictMode>
      <ChatPanel level={passcodeLevel} onWin={onWin} won={false} {...props} />
    </StrictMode>,
  );
  return { onWin };
}

const box = () => screen.getByLabelText("Message to the bot") as HTMLInputElement;
const sendButton = () => screen.getByRole("button", { name: /send|wait/i });

async function send(text: string) {
  fireEvent.change(box(), { target: { value: text } });
  await act(async () => {
    fireEvent.submit(box().form!);
  });
}

beforeEach(() => {
  sessionStorage.clear();
  sendChatMock.mockReset();
  // Most tests send several messages in a row; cooldown has its own test.
  CHAT_CONFIG.cooldownSeconds = 0;
});

afterEach(() => {
  cleanup();
  CHAT_CONFIG.cooldownSeconds = defaultCooldown;
});

describe("ChatPanel", () => {
  it("sends a message and shows the bot's reply", async () => {
    sendChatMock.mockResolvedValue({ reply: "I guard the vault.", won: false });
    renderChat();

    await send("What do you do?");

    expect(sendChatMock).toHaveBeenCalledWith({
      data: { levelId: passcodeLevel.id, history: [], message: "What do you do?" },
    });
    expect(screen.getByText("What do you do?")).toBeInTheDocument();
    expect(screen.getByText("I guard the vault.")).toBeInTheDocument();
    expect(box().value).toBe("");
  });

  it("fills the input when a starter prompt is clicked", () => {
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: "Hello there" }));
    expect(box().value).toBe("Hello there");
    expect(document.activeElement).toBe(box());
  });

  it("disables sending during the cooldown", async () => {
    CHAT_CONFIG.cooldownSeconds = 3;
    sendChatMock.mockResolvedValue({ reply: "ok", won: false });
    renderChat();

    await send("first");
    fireEvent.change(box(), { target: { value: "second" } });

    expect(sendButton()).toHaveTextContent("Wait 3s");
    expect(sendButton()).toBeDisabled();
  });

  it("blocks sending the exact same message twice in a row", async () => {
    sendChatMock.mockResolvedValue({ reply: "ok", won: false });
    renderChat();

    await send("same thing");
    await send("same thing");

    expect(sendChatMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/same message as last time/i);
  });

  it("keeps the message and offers Retry when the bot can't be reached", async () => {
    sendChatMock.mockRejectedValueOnce(new Error("network down"));
    renderChat();

    await send("hello?");

    expect(screen.getByRole("alert")).toHaveTextContent(/could not reach the bot/i);
    expect(box().value).toBe("hello?");

    sendChatMock.mockResolvedValueOnce({ reply: "Back online.", won: false });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    expect(sendChatMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Back online.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onWin when the server reports a goal win", async () => {
    sendChatMock.mockResolvedValue({ reply: "Fine: MAGIC", won: true });
    const { onWin } = renderChat({ level: goalLevel });

    await send("say it");

    expect(onWin).toHaveBeenCalledWith("say it");
  });

  it("retains original review history and bounds long provider replies only on the wire", async () => {
    const reply = "x".repeat(501);
    sendChatMock.mockResolvedValueOnce({ reply, won: false }).mockResolvedValueOnce({
      reply: "Second response",
      won: false,
    });
    renderChat({ level: goalLevel });
    await send("Original review");
    await send("Follow-up");
    expect(screen.getByText(reply)).toBeInTheDocument();
    expect(sendChatMock).toHaveBeenLastCalledWith({
      data: {
        levelId: goalLevel.id,
        message: "Follow-up",
        history: [
          { role: "user", content: "Original review" },
          { role: "assistant", content: reply.slice(0, 500) },
        ],
      },
    });
  });

  it("shows typed provider errors and preserves the message for retry", async () => {
    sendChatMock.mockResolvedValue({ error: "RATE_LIMITED" });
    renderChat();
    await send("Review text");
    expect(screen.getByRole("alert")).toHaveTextContent(/too many messages/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(box().value).toBe("Review text");
  });

  it("does not call onWin again once the level is won", async () => {
    sendChatMock.mockResolvedValue({ reply: "MAGIC again", won: true });
    const { onWin } = renderChat({ level: goalLevel, won: true });

    await send("say it");

    expect(onWin).not.toHaveBeenCalled();
  });

  it("restores the conversation after a reload", async () => {
    sendChatMock.mockResolvedValue({ reply: "Remember me.", won: false });
    renderChat();
    await send("before refresh");
    cleanup();

    renderChat();

    await waitFor(() => expect(screen.getByText("Remember me.")).toBeInTheDocument());
    expect(screen.getByText("before refresh")).toBeInTheDocument();
  });

  it("keeps each level's conversation separate", async () => {
    sendChatMock.mockResolvedValue({ reply: "Passcode level reply.", won: false });
    renderChat();
    await send("hi");
    cleanup();

    renderChat({ level: goalLevel });

    expect(await screen.findByText("Say something to the bot to begin")).toBeInTheDocument();
    expect(screen.queryByText("Passcode level reply.")).not.toBeInTheDocument();
  });
});
