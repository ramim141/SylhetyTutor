import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentViewer } from "./DocumentViewer";
import { mixed } from "../../i18n";
import { getDocumentBlob } from "../../api/admin";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/admin", () => ({ getDocumentBlob: vi.fn() }));

const URL_PATH = "/api/v1/tutors/documents/p1/nid/";

describe("DocumentViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    URL.createObjectURL = vi.fn(() => "blob:scan-1");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows the scan from a blob and gives the blob back when it goes away", async () => {
    getDocumentBlob.mockResolvedValue(new Blob(["x"], { type: "image/jpeg" }));
    const { unmount } = render(<DocumentViewer kind="nid" url={URL_PATH} />);

    const image = await screen.findByAltText(mixed["admin.docs.nid"]);
    expect(image).toHaveAttribute("src", "blob:scan-1");
    expect(getDocumentBlob).toHaveBeenCalledWith(URL_PATH, expect.any(Object));

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:scan-1");
  });

  it("opens full screen with the do-not-share warning", async () => {
    getDocumentBlob.mockResolvedValue(new Blob(["x"]));
    const user = userEvent.setup();
    render(<DocumentViewer kind="nid" url={URL_PATH} />);

    await user.click(await screen.findByRole("button", { name: /NID/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(mixed["admin.docs.warning"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.close"] }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers a retry when the file cannot be loaded", async () => {
    getDocumentBlob.mockRejectedValueOnce(new Error("network"));
    getDocumentBlob.mockResolvedValueOnce(new Blob(["x"]));
    const user = userEvent.setup();
    render(<DocumentViewer kind="student_id" url={URL_PATH} />);

    await user.click(await screen.findByRole("button", { name: mixed["common.retry"] }));

    await waitFor(() =>
      expect(screen.getByAltText(mixed["admin.docs.student_id"])).toBeInTheDocument(),
    );
    expect(getDocumentBlob).toHaveBeenCalledTimes(2);
  });
});
