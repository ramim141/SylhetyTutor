import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentUpload } from "./DocumentUpload";
import { deleteDocument, getDocumentBlob, uploadDocument } from "../../../api/tutors";
import { mixed } from "../../../i18n";
import { useLanguageStore } from "../../../store/languageStore";

vi.mock("../../../api/tutors", () => ({
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentBlob: vi.fn(),
}));

const label = mixed["tr.doc.nid"];
const profile = (nid = false) => ({ id: "p1", documents: { nid, student_id: false } });
const photo = (name = "nid.jpg", type = "image/jpeg", size = 2000) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};
const setup = (props = {}) => {
  const onProfile = vi.fn();
  render(<DocumentUpload kind="nid" profile={profile()} onProfile={onProfile} {...props} />);
  return { onProfile, input: screen.getByLabelText(label, { selector: "input" }) };
};

describe("DocumentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    getDocumentBlob.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));
  });

  it("says nothing is uploaded yet and does not ask for a preview", () => {
    setup();

    expect(screen.getByText(mixed["tr.doc.missing"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["tr.doc.choose"] })).toBeInTheDocument();
    expect(getDocumentBlob).not.toHaveBeenCalled();
  });

  it("only offers photo types to the file picker", () => {
    const { input } = setup();

    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("shows a preview fetched with the login token, for an uploaded document", async () => {
    setup({ profile: profile(true) });

    expect(screen.getByText(mixed["tr.doc.uploaded"])).toBeInTheDocument();
    const image = await screen.findByRole("img", {
      name: mixed["tr.doc.preview"].replace("{label}", label),
    });
    expect(image).toHaveAttribute("src", "blob:preview");
    expect(getDocumentBlob).toHaveBeenCalledWith("p1", "nid", expect.any(Object));
  });

  it("keeps saying Uploaded when only the preview fails", async () => {
    getDocumentBlob.mockRejectedValue(new Error("Network Error"));
    setup({ profile: profile(true) });

    expect(await screen.findByText(mixed["tr.doc.previewFailed"])).toBeInTheDocument();
    expect(screen.getByText(mixed["tr.doc.uploaded"])).toBeInTheDocument();
  });

  it("uploads the chosen photo and hands over the updated profile", async () => {
    const updated = profile(true);
    uploadDocument.mockResolvedValue(updated);
    const { onProfile, input } = setup();
    const file = photo();

    await userEvent.upload(input, file);

    await waitFor(() => expect(onProfile).toHaveBeenCalledWith(updated));
    expect(uploadDocument).toHaveBeenCalledWith("nid", file, expect.any(Object));
  });

  it("shows progress while the file is on its way", async () => {
    let finish;
    uploadDocument.mockImplementation((kind, file, { onProgress }) => {
      onProgress(40);
      return new Promise((resolve) => (finish = resolve));
    });
    const { input } = setup();

    await userEvent.upload(input, photo());

    const bar = await screen.findByRole("progressbar", {
      name: mixed["tr.doc.uploading"].replace("{percent}", "40"),
    });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByRole("button", { name: mixed["tr.doc.choose"] })).toBeDisabled();
    finish(profile(true));
    await waitFor(() =>
      expect(screen.queryByRole("progressbar", { name: /40/ })).not.toBeInTheDocument(),
    );
  });

  it.each([
    ["a PDF", photo("a.pdf", "application/pdf"), "error.file.unsupported_format"],
    ["a huge photo", photo("big.jpg", "image/jpeg", 6 * 1024 * 1024), "error.file.file_too_large"],
  ])("refuses %s without sending it", async (_, file, key) => {
    const { onProfile, input } = setup();

    await userEvent.upload(input, file, { applyAccept: false });

    expect(await screen.findByText(mixed[key])).toBeInTheDocument();
    expect(uploadDocument).not.toHaveBeenCalled();
    expect(onProfile).not.toHaveBeenCalled();
  });

  it("shows the server's reason in the user's language", async () => {
    uploadDocument.mockRejectedValue({
      response: {
        status: 400,
        data: { code: "invalid", fields: { file: [{ code: "not_an_image", message: "x" }] } },
      },
    });
    const { input } = setup();

    await userEvent.upload(input, photo());

    expect(await screen.findByText(mixed["error.file.not_an_image"])).toBeInTheDocument();
  });

  it("tells the tutor when the profile is locked while being verified", async () => {
    uploadDocument.mockRejectedValue({
      response: { status: 409, data: { code: "profile_locked", detail: "locked" } },
    });
    const { input } = setup();

    await userEvent.upload(input, photo());

    expect(await screen.findByText(mixed["error.profile_locked"])).toBeInTheDocument();
  });

  it("asks the user to wait when uploads are throttled", async () => {
    uploadDocument.mockRejectedValue({
      response: { status: 429, data: { code: "throttled", retry_after: 20 } },
    });
    const { input } = setup();

    await userEvent.upload(input, photo());

    expect(
      await screen.findByText(mixed["error.throttledWait"].replace("{seconds}", "20")),
    ).toBeInTheDocument();
  });

  it("removes an uploaded document", async () => {
    const after = profile(false);
    deleteDocument.mockResolvedValue(after);
    const { onProfile } = setup({ profile: profile(true) });

    await userEvent.click(screen.getByRole("button", { name: mixed["tr.doc.remove"] }));

    await waitFor(() => expect(onProfile).toHaveBeenCalledWith(after));
    expect(deleteDocument).toHaveBeenCalledWith("nid");
  });

  it("is read-only when disabled", () => {
    setup({ profile: profile(true), disabled: true });

    expect(screen.getByRole("button", { name: mixed["tr.doc.replace"] })).toBeDisabled();
    expect(screen.getByRole("button", { name: mixed["tr.doc.remove"] })).toBeDisabled();
  });
});
