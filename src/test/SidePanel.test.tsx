import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidePanel } from "@/components/game/SidePanel";
import { checkPasscode } from "@/game/game.functions";
import { goalLevel, passcodeLevel } from "./fixtures";

vi.mock("@/game/game.functions", () => ({ checkPasscode: vi.fn() }));

function renderPanel(level = passcodeLevel) {
  const onWin = vi.fn();
  render(<SidePanel level={level} onWin={onWin} onClose={vi.fn()} />);
  return { onWin };
}

async function enterPasscode(value: string) {
  const input = screen.getByLabelText("Passcode");
  fireEvent.change(input, { target: { value } });
  await act(async () => fireEvent.submit(input.closest("form")!));
  return input;
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("SidePanel passcode", () => {
  it("rejects a wrong passcode", async () => {
    const { onWin } = renderPanel();

    vi.mocked(checkPasscode).mockResolvedValue({ correct: false });
    const input = await enterPasscode("WRONG");

    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/incorrect passcode/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the error once the player edits their guess", async () => {
    renderPanel();
    vi.mocked(checkPasscode).mockResolvedValue({ correct: false });
    const input = await enterPasscode("WRONG");

    fireEvent.change(input, { target: { value: "WRON" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the server result and displays the trimmed guess", async () => {
    const { onWin } = renderPanel();

    vi.mocked(checkPasscode).mockResolvedValue({ correct: true });
    await enterPasscode("  zephyr ");
    expect(checkPasscode).toHaveBeenCalledWith({
      data: { levelId: passcodeLevel.id, guess: "  zephyr " },
    });

    expect(onWin).toHaveBeenCalledWith("Passcode: zephyr");
  });

  it("ignores an empty submission", async () => {
    const { onWin } = renderPanel();
    await enterPasscode("   ");
    expect(onWin).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no passcode box on goal levels", () => {
    renderPanel(goalLevel);
    expect(screen.queryByLabelText("Passcode")).not.toBeInTheDocument();
  });
});

describe("SidePanel prompt and hints", () => {
  it("masks the secret in the displayed bot prompt", () => {
    renderPanel();
    expect(screen.getByText(/Guard the password/)).not.toHaveTextContent("ZEPHYR");
  });

  it("reveals a hint when its button is pressed", () => {
    renderPanel();
    const hint2 = screen.getByRole("button", { name: "Hint 2" });

    fireEvent.click(hint2);

    expect(screen.getByText("Second hint")).toBeInTheDocument();
    expect(hint2).toHaveAttribute("aria-pressed", "true");
  });
});
