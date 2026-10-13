import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

function Harness({ onClose = () => {}, busy = false }) {
  const [text, setText] = useState("");
  return (
    <Dialog isOpen onClose={() => onClose()} title="Reject" busy={busy}>
      <textarea aria-label="reason" value={text} onChange={(e) => setText(e.target.value)} />
    </Dialog>
  );
}

describe("Dialog", () => {
  it("keeps focus in the field while the parent re-renders on every keystroke", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("reason"));
    await user.keyboard("a longer sentence");

    expect(screen.getByLabelText("reason")).toHaveValue("a longer sentence");
  });

  it("closes on Escape unless busy", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<Harness onClose={onClose} busy />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
