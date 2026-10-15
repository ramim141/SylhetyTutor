import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConfirmTuition from "./ConfirmTuition";
import { mixed } from "../i18n";
import { answerConfirmation, getConfirmation } from "../api/payments";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";

vi.mock("../api/payments", () => ({ getConfirmation: vi.fn(), answerConfirmation: vi.fn() }));

const pending = {
  tutor_name: "Rahim Uddin",
  demo_at: "2026-10-10T10:00:00+06:00",
  answered: false,
  started: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/confirm/tok123"]}>
      <Routes>
        <Route path="/confirm/:token" element={<ConfirmTuition />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConfirmTuition page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    // a guardian opening the emailed link is not signed in
    useAuthStore.setState({ user: null, status: "unauthenticated" });
  });

  it("asks the question with the tutor's name and no contact details", async () => {
    getConfirmation.mockResolvedValue(pending);
    renderPage();

    expect(await screen.findByText(mixed["confirm.title"])).toBeInTheDocument();
    expect(screen.getByText(/Rahim Uddin/)).toBeInTheDocument();
    expect(getConfirmation).toHaveBeenCalledWith("tok123");
    expect(screen.queryByText(/01\d{9}/)).not.toBeInTheDocument();
  });

  it("records yes with one tap and thanks the guardian", async () => {
    getConfirmation.mockResolvedValue(pending);
    answerConfirmation.mockResolvedValue({ ...pending, answered: true, started: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["confirm.yes"] }));
    await waitFor(() => expect(answerConfirmation).toHaveBeenCalledWith("tok123", "yes"));
    expect(await screen.findByText(mixed["confirm.thanksYes"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["confirm.yes"] })).not.toBeInTheDocument();
  });

  it("records no", async () => {
    getConfirmation.mockResolvedValue(pending);
    answerConfirmation.mockResolvedValue({ ...pending, answered: true, started: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["confirm.no"] }));
    await waitFor(() => expect(answerConfirmation).toHaveBeenCalledWith("tok123", "no"));
    expect(await screen.findByText(mixed["confirm.thanksNo"])).toBeInTheDocument();
  });

  it("shows the thanks straight away for an already answered link", async () => {
    getConfirmation.mockResolvedValue({ ...pending, answered: true, started: true });
    renderPage();
    expect(await screen.findByText(mixed["confirm.thanksYes"])).toBeInTheDocument();
  });

  it("says a bad or old link is not valid, without an error screen", async () => {
    getConfirmation.mockRejectedValue({ response: { status: 404, data: { code: "invalid_link" } } });
    renderPage();
    expect(await screen.findByText(mixed["confirm.invalid"])).toBeInTheDocument();
  });

  it("shows a connection problem differently from an invalid link", async () => {
    getConfirmation.mockRejectedValue(new Error("network"));
    renderPage();
    expect(await screen.findByText(mixed["confirm.loadFailed"])).toBeInTheDocument();
  });

  it("explains an answer the server refuses and keeps the buttons", async () => {
    getConfirmation.mockResolvedValue(pending);
    answerConfirmation.mockRejectedValue({
      response: { status: 409, data: { code: "already_answered", detail: "x" } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: mixed["confirm.yes"] }));
    expect(await screen.findByText(mixed["error.already_answered"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["confirm.yes"] })).toBeInTheDocument();
  });
});
