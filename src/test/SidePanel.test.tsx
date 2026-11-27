import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidePanel } from "@/components/game/SidePanel";
import { goalLevel, passcodeLevel } from "./fixtures";

// SidePanel only needs buildSystemPrompt; keep the server function out of the test.
vi.mock("@/game/bots/llm.functions", () => ({ askOpenRouter: vi.fn() }));

function renderPanel(level = passcodeLevel) {
  const onWin = vi.fn();
  render(<SidePanel level={level} defenses={[]} onWin={onWin} onClose={vi.fn()} />);
  return { onWin };
}

function enterPasscode(value: string) {
  const input = screen.getByLabelText("Passcode");
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
  return input;
}

afterEach(cleanup);

describe("SidePanel passcode", () => {
  it("rejects a wrong passcode", () => {
    const { onWin } = renderPanel();

    const input = enterPasscode("WRONG");

    expect(onWin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/incorrect passcode/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the error once the player edits their guess", () => {
    renderPanel();
    const input = enterPasscode("WRONG");

    fireEvent.change(input, { target: { value: "WRON" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts the right passcode regardless of case and spacing", () => {
    const { onWin } = renderPanel();

    enterPasscode("  zephyr ");

    expect(onWin).toHaveBeenCalledWith("Passcode: zephyr");
  });

  it("ignores an empty submission", () => {
    const { onWin } = renderPanel();
    enterPasscode("   ");
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
