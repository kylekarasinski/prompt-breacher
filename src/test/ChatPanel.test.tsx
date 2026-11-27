import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "@/components/game/ChatPanel";
import { askBot } from "@/game/bots/registry";
import { CHAT_CONFIG } from "@/game/config/chat";
import { goalLevel, passcodeLevel } from "./fixtures";

// The real registry calls the OpenRouter server function; tests control replies directly.
vi.mock("@/game/bots/registry", () => ({ askBot: vi.fn() }));
const askBotMock = vi.mocked(askBot);

const defaultCooldown = CHAT_CONFIG.cooldownSeconds;

function renderChat(props: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  const onWin = vi.fn();
  // StrictMode mounts twice in dev, which is when a premature save could wipe restored history.
  render(
    <StrictMode>
      <ChatPanel level={passcodeLevel} defenses={[]} onWin={onWin} won={false} {...props} />
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
  askBotMock.mockReset();
  // Most tests send several messages in a row; cooldown has its own test.
  CHAT_CONFIG.cooldownSeconds = 0;
});

afterEach(() => {
  cleanup();
  CHAT_CONFIG.cooldownSeconds = defaultCooldown;
});

describe("ChatPanel", () => {
  it("sends a message and shows the bot's reply", async () => {
    askBotMock.mockResolvedValue("I guard the vault.");
    renderChat();

    await send("What do you do?");

    expect(askBotMock).toHaveBeenCalledWith(passcodeLevel, [], [], "What do you do?");
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
    askBotMock.mockResolvedValue("ok");
    renderChat();

    await send("first");
    fireEvent.change(box(), { target: { value: "second" } });

    expect(sendButton()).toHaveTextContent("Wait 3s");
    expect(sendButton()).toBeDisabled();
  });

  it("blocks sending the exact same message twice in a row", async () => {
    askBotMock.mockResolvedValue("ok");
    renderChat();

    await send("same thing");
    await send("same thing");

    expect(askBotMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/same message as last time/i);
  });

  it("keeps the message and offers Retry when the bot can't be reached", async () => {
    askBotMock.mockRejectedValueOnce(new Error("network down"));
    renderChat();

    await send("hello?");

    expect(screen.getByRole("alert")).toHaveTextContent(/could not reach the bot/i);
    expect(box().value).toBe("hello?");

    askBotMock.mockResolvedValueOnce("Back online.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    expect(askBotMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Back online.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onWin when a goal level's check passes", async () => {
    askBotMock.mockResolvedValue("Fine: MAGIC");
    const { onWin } = renderChat({ level: goalLevel });

    await send("say it");

    expect(onWin).toHaveBeenCalledWith("say it");
  });

  it("does not call onWin again once the level is won", async () => {
    askBotMock.mockResolvedValue("MAGIC again");
    const { onWin } = renderChat({ level: goalLevel, won: true });

    await send("say it");

    expect(onWin).not.toHaveBeenCalled();
  });

  it("restores the conversation after a reload", async () => {
    askBotMock.mockResolvedValue("Remember me.");
    renderChat();
    await send("before refresh");
    cleanup();

    renderChat();

    await waitFor(() => expect(screen.getByText("Remember me.")).toBeInTheDocument());
    expect(screen.getByText("before refresh")).toBeInTheDocument();
  });

  it("keeps each level's conversation separate", async () => {
    askBotMock.mockResolvedValue("Passcode level reply.");
    renderChat();
    await send("hi");
    cleanup();

    renderChat({ level: goalLevel });

    expect(await screen.findByText("Say something to the bot to begin")).toBeInTheDocument();
    expect(screen.queryByText("Passcode level reply.")).not.toBeInTheDocument();
  });
});
