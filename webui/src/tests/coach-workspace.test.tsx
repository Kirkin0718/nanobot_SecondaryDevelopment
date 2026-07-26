import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckinDrawer } from "@/components/coach/CheckinDrawer";
import { NotesDrawer } from "@/components/coach/NotesDrawer";
import { JourneyStrip } from "@/components/journey/JourneyStrip";
import { useCoachState } from "@/hooks/useCoachState";
import { htmlToMarkdown, markdownToHtml } from "@/lib/rich-notes";
import * as api from "@/lib/api";
import { ClientProvider } from "@/providers/ClientProvider";
import { CoachProvider } from "@/providers/CoachProvider";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCoachState: vi.fn(),
    saveCoachNotes: vi.fn(),
    postCoachCheckin: vi.fn(),
  };
});

function fakeClient() {
  return {
    status: "open" as const,
    defaultChatId: null as string | null,
    onStatus: () => () => {},
    onError: () => () => {},
    onChat: () => () => {},
    getRunStartedAt: () => null,
    onSessionUpdate: () => () => {},
    sendMessage: vi.fn(),
    newChat: vi.fn(),
    forkChat: vi.fn(),
    attach: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
    updateUrl: vi.fn(),
  };
}

function CoachHarness({
  sessionKey,
  children,
}: {
  sessionKey: string;
  children: ReactNode;
}) {
  const coach = useCoachState(sessionKey);
  return <CoachProvider value={coach}>{children}</CoachProvider>;
}

function wrap(client: ReturnType<typeof fakeClient>, sessionKey = "websocket:chat-java") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ClientProvider
        client={client as unknown as import("@/lib/nanobot-client").NanobotClient}
        token="tok"
      >
        <CoachHarness sessionKey={sessionKey}>{children}</CoachHarness>
      </ClientProvider>
    );
  };
}

describe("rich-notes markdown", () => {
  it("round-trips bold, headings, and colored highlights", () => {
    const md = "## Title\nHello **world** and ==green:ok== {{red:alert}}";
    const html = markdownToHtml(md);
    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain('data-color="green"');
    expect(html).toContain('data-fg="red"');
    const back = htmlToMarkdown(html);
    expect(back).toContain("## Title");
    expect(back).toContain("**world**");
    expect(back).toContain("==green:ok==");
    expect(back).toContain("{{red:alert}}");
  });

  it("builds a TOC from headings", async () => {
    const { upsertTableOfContents } = await import("@/lib/rich-notes");
    const out = upsertTableOfContents("# A\n\n## B\n\ntext\n", "TOC");
    expect(out).toContain("## TOC");
    expect(out).toContain("- A");
    expect(out).toContain("- B");
  });

  it("sanitizes pasted HTML and drops scripts/images", async () => {
    const { sanitizePastedHtml, htmlToMarkdown } = await import("@/lib/rich-notes");
    const dirty =
      '<p>Hello <strong>world</strong></p><script>alert(1)</script><img src=x onerror=alert(1)>'
      + '<p style="color:red"><mark data-color="green">ok</mark></p>';
    const clean = sanitizePastedHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<img");
    expect(clean).toContain("<strong>world</strong>");
    expect(clean).toContain('data-color="green"');
    const md = htmlToMarkdown(clean);
    expect(md).toContain("**world**");
    expect(md).toContain("==green:ok==");
  });
});

describe("JourneyStrip", () => {
  it("shows goal choice chips when no active goal", () => {
    const onGoalChoice = vi.fn();
    render(
      <JourneyStrip
        hasActiveGoal={false}
        hasSession={false}
        hasMessages={false}
        notesVisited={false}
        onGoalChoice={onGoalChoice}
        onOpenNotes={vi.fn()}
      />,
    );
    expect(screen.getByTestId("journey-goal-choices")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set a learning goal" }));
    expect(onGoalChoice).toHaveBeenCalledWith("Set a learning goal");
  });

  it("marks step states along the coach journey", () => {
    const onOpenNotes = vi.fn();
    const onOpenCheckin = vi.fn();
    const onFocusChat = vi.fn();
    const onFocusSessions = vi.fn();
    const { rerender } = render(
      <JourneyStrip
        hasActiveGoal={false}
        hasSession={false}
        hasMessages={false}
        notesVisited={false}
        onOpenNotes={onOpenNotes}
        onOpenCheckin={onOpenCheckin}
        onFocusChat={onFocusChat}
        onFocusSessions={onFocusSessions}
      />,
    );
    expect(screen.getByTestId("journey-step-goal")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("journey-step-session")).toHaveAttribute("data-done", "false");

    rerender(
      <JourneyStrip
        hasActiveGoal
        hasSession
        hasMessages
        notesVisited={false}
        hasNotesContent={false}
        compactActions
        onOpenNotes={onOpenNotes}
        onOpenCheckin={onOpenCheckin}
        onFocusChat={onFocusChat}
        onFocusSessions={onFocusSessions}
      />,
    );
    expect(screen.getByTestId("journey-step-goal")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("journey-step-session")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("journey-step-chat")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("journey-step-notes")).toHaveAttribute("data-active", "true");
    // Side Notes/Check-in buttons are hidden when compactActions (header owns them).
    expect(screen.queryByRole("button", { name: "Notes" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("journey-step-notes"));
    expect(onOpenNotes).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("journey-step-chat"));
    expect(onFocusChat).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("journey-step-session"));
    expect(onFocusSessions).toHaveBeenCalled();

    rerender(
      <JourneyStrip
        hasActiveGoal
        hasSession
        hasMessages
        notesVisited={false}
        hasNotesContent
        compactActions
        onOpenNotes={onOpenNotes}
      />,
    );
    expect(screen.getByTestId("journey-step-notes")).toHaveAttribute("data-done", "true");
  });
});

describe("CheckinDrawer", () => {
  beforeEach(() => {
    vi.mocked(api.fetchCoachState).mockReset();
    vi.mocked(api.postCoachCheckin).mockReset();
  });

  it("shows today CTA and posts check-in", async () => {
    const notChecked = {
      active: true,
      topic: "java-basics",
      paths: { notes: "learning/java-basics/notes.md" },
      progress: { done: 1, total: 4, ratio: 0.25, stage_label: "1 / 4" },
      notes: "",
      log_tail: "",
      checked_in_today: false,
      checkin_days: ["2026-07-22", "2026-07-23"],
      today: "2026-07-24",
    };
    const checked = {
      ...notChecked,
      checked_in_today: true,
      checkin_days: ["2026-07-22", "2026-07-23", "2026-07-24"],
    };
    vi.mocked(api.fetchCoachState).mockResolvedValue(notChecked);
    vi.mocked(api.postCoachCheckin).mockImplementation(async () => {
      vi.mocked(api.fetchCoachState).mockResolvedValue(checked);
      return {
        ok: true,
        path: "learning/java-basics/log.md",
        today: "2026-07-24",
        entry: "- 2026-07-24 check-in",
      };
    });

    const onCheckedIn = vi.fn();
    render(
      <CheckinDrawer
        open
        onOpenChange={vi.fn()}
        onCheckedIn={onCheckedIn}
      />,
      { wrapper: wrap(fakeClient()) },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /check in today/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /check in today/i }));
    await waitFor(() => {
      expect(api.postCoachCheckin).toHaveBeenCalledWith(
        "tok",
        "websocket:chat-java",
        undefined,
      );
    });
    await waitFor(() => {
      expect(onCheckedIn).toHaveBeenCalled();
    });
  });
});

describe("NotesDrawer", () => {
  beforeEach(() => {
    vi.mocked(api.fetchCoachState).mockReset();
    vi.mocked(api.saveCoachNotes).mockReset();
  });

  it("loads notes and sends generate prompt from selected scope", async () => {
    vi.mocked(api.fetchCoachState).mockResolvedValue({
      active: true,
      topic: "java-basics",
      paths: { notes: "learning/java-basics/notes.md" },
      progress: { done: 1, total: 4, ratio: 0.25, stage_label: "1 / 4" },
      notes: "# Notes\nseed",
      log_tail: "",
      checked_in_today: false,
      checkin_days: [],
      today: "2026-07-24",
    });
    const onSend = vi.fn();
    render(
      <NotesDrawer
        open
        onOpenChange={vi.fn()}
        messages={[
          {
            id: "u1",
            role: "user",
            content: "今天学循环",
            createdAt: 1,
          },
          {
            id: "a1",
            role: "assistant",
            content: "先写 for 循环示例",
            createdAt: 2,
          },
        ]}
        onSend={onSend}
      />,
      { wrapper: wrap(fakeClient()) },
    );

    await waitFor(() => {
      expect(api.fetchCoachState).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("button", { name: /AI generate notes/i }));
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByTestId("notes-scope-picker")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Generate from selection/i }));
    expect(onSend).toHaveBeenCalledWith(
      expect.stringContaining("[Coach·Generate notes]"),
      expect.objectContaining({ hiddenHistory: true }),
    );
    expect(onSend.mock.calls[0][0]).toContain("learning/java-basics/notes.md");
    expect(onSend.mock.calls[0][0]).toContain("今天学循环");
  });
});
