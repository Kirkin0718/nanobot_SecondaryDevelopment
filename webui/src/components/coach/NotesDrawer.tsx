import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, ListChecks, NotebookPen, Pencil, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RichNotesEditor } from "@/components/coach/RichNotesEditor";
import { MarkdownText } from "@/components/MarkdownText";
import { Button } from "@/components/ui/button";
import { saveCoachNotes, fetchFilePreview } from "@/lib/api";
import type { UIMessage } from "@/lib/types";
import { useClient } from "@/providers/ClientProvider";
import { useCoach } from "@/providers/CoachProvider";
import { cn } from "@/lib/utils";

interface NotesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages?: UIMessage[];
  onSend: (content: string, options?: { hiddenHistory?: boolean }) => void;
  disabled?: boolean;
  /** Open / edit a specific notes file (hub deep-link); allow-listed on the server. */
  notesPathOverride?: string | null;
}

function normalizeNotesPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function selectableMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter(
    (m) =>
      (m.role === "user" || m.role === "assistant")
      && typeof m.content === "string"
      && m.content.trim()
      && !m.isStreaming
      && !m.toolEvents?.length,
  );
}

function clip(text: string, n = 160): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length <= n ? one : `${one.slice(0, n - 1)}…`;
}

/** Soft cap for AI note prompts (chars of scoped chat body). */
export const NOTES_SCOPE_CHAR_LIMIT = 12_000;

function buildScopedChatBlock(
  messages: UIMessage[],
  selectedIds: Set<string>,
  limit = NOTES_SCOPE_CHAR_LIMIT,
): { text: string; truncated: boolean; usedIds: string[] } {
  const picked = messages.filter((m) => selectedIds.has(m.id));
  if (picked.length === 0) return { text: "", truncated: false, usedIds: [] };

  const chunks: string[] = [];
  const usedIds: string[] = [];
  let used = 0;
  let truncated = false;
  for (const m of picked) {
    const piece = `[${m.role}]\n${m.content.trim()}`;
    const sep = chunks.length ? "\n\n---\n\n" : "";
    if (used + sep.length + piece.length > limit) {
      const remain = limit - used - sep.length;
      if (remain > 80) {
        const cut = Math.max(0, remain - 1);
        chunks.push(`${piece.slice(0, cut)}…`);
        usedIds.push(m.id);
      }
      truncated = true;
      break;
    }
    chunks.push(piece);
    usedIds.push(m.id);
    used += sep.length + piece.length;
  }
  if (usedIds.length < picked.length) truncated = true;
  return { text: chunks.join("\n\n---\n\n"), truncated, usedIds };
}

/** Prefer recent messages that fit under the char budget. */
function selectIdsWithinBudget(
  messages: UIMessage[],
  limit = NOTES_SCOPE_CHAR_LIMIT,
  maxCount = 24,
): Set<string> {
  const recent = messages.slice(-maxCount);
  const ids = new Set<string>();
  let used = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const m = recent[i];
    const piece = `[${m.role}]\n${m.content.trim()}`;
    const sep = ids.size ? "\n\n---\n\n".length : 0;
    if (used + sep + piece.length > limit) break;
    ids.add(m.id);
    used += sep + piece.length;
  }
  return ids;
}

export function NotesDrawer({
  open,
  onOpenChange,
  messages = [],
  onSend,
  disabled = false,
  notesPathOverride = null,
}: NotesDrawerProps) {
  const { t } = useTranslation();
  const { token } = useClient();
  const { sessionKey, coach, error: coachError, refresh, setCoach } = useCoach();
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickingScope, setPickingScope] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const saveTimer = useRef<number | null>(null);
  const notesRef = useRef(notes);
  const dirtyRef = useRef(false);
  notesRef.current = notes;

  const topic = coach?.topic;
  const sessionNotesPath = normalizeNotesPath(
    coach?.paths?.notes || (topic ? `learning/${topic}/notes.md` : null),
  );
  const overridePath = normalizeNotesPath(notesPathOverride);
  const resolvedNotesPath = overridePath || sessionNotesPath;
  const editingForeign =
    Boolean(overridePath && sessionNotesPath && overridePath !== sessionNotesPath);
  const canEdit = Boolean(sessionKey && resolvedNotesPath);

  const chatChoices = useMemo(() => selectableMessages(messages), [messages]);

  useEffect(() => {
    if (!open) {
      dirtyRef.current = false;
      setLoadError(null);
      return;
    }
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !sessionKey || !resolvedNotesPath) return;
    if (dirtyRef.current) return;

    let cancelled = false;
    const load = async () => {
      // Current session notes come from shared coach state.
      if (!editingForeign && !overridePath) {
        setNotes(coach?.notes ?? "");
        setLoadError(null);
        return;
      }
      if (!editingForeign && overridePath && overridePath === sessionNotesPath) {
        setNotes(coach?.notes ?? "");
        setLoadError(null);
        return;
      }
      try {
        const preview = await fetchFilePreview(token, sessionKey, resolvedNotesPath);
        if (!cancelled) {
          setNotes(preview.content ?? "");
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    coach?.notes,
    editingForeign,
    open,
    overridePath,
    resolvedNotesPath,
    sessionKey,
    sessionNotesPath,
    token,
  ]);

  useEffect(() => {
    if (!open) {
      setPickingScope(false);
      return;
    }
    setSelectedIds(selectIdsWithinBudget(chatChoices));
  }, [open, chatChoices]);

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const scheduleSave = useCallback(
    (next: string) => {
      if (!sessionKey || !canEdit || !resolvedNotesPath) return;
      dirtyRef.current = true;
      setSaveState("saving");
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        try {
          await saveCoachNotes(
            token,
            sessionKey,
            next,
            "",
            editingForeign || overridePath ? resolvedNotesPath : undefined,
          );
          if (!editingForeign) {
            setCoach((prev) => (prev ? { ...prev, notes: next } : prev));
          }
          dirtyRef.current = false;
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }, 900);
    },
    [
      canEdit,
      editingForeign,
      overridePath,
      resolvedNotesPath,
      sessionKey,
      setCoach,
      token,
    ],
  );

  const buildScopedPrompt = (kind: "generate" | "enrich") => {
    const { text: scopeBlock, truncated } = buildScopedChatBlock(
      chatChoices,
      selectedIds,
    );
    const path = resolvedNotesPath || "";
    const truncNote = truncated
      ? `\n\n${t("thread.coach.drawer.scopeTruncatedNote", {
          limit: NOTES_SCOPE_CHAR_LIMIT,
        })}`
      : "";
    if (kind === "generate") {
      if (scopeBlock) {
        return (
          t("thread.coach.prompts.generateWithScope", { path, scope: scopeBlock })
          + truncNote
        );
      }
      return t("thread.coach.prompts.generateWithoutScope", { path });
    }
    if (scopeBlock) {
      return (
        t("thread.coach.prompts.enrichWithScope", { path, scope: scopeBlock })
        + truncNote
      );
    }
    return t("thread.coach.prompts.enrichWithoutScope", { path });
  };

  const scopeStats = useMemo(
    () => buildScopedChatBlock(chatChoices, selectedIds),
    [chatChoices, selectedIds],
  );

  const onGenerate = () => {
    if (!resolvedNotesPath || busy) return;
    if (!pickingScope) {
      setPickingScope(true);
      return;
    }
    onSend(buildScopedPrompt("generate"), { hiddenHistory: true });
    setPickingScope(false);
  };

  const onEnrich = async () => {
    if (!resolvedNotesPath || !sessionKey || busy) return;
    if (!pickingScope) {
      setPickingScope(true);
      return;
    }
    setBusy(true);
    try {
      await saveCoachNotes(
        token,
        sessionKey,
        notesRef.current,
        "",
        editingForeign || overridePath ? resolvedNotesPath ?? undefined : undefined,
      );
      if (!editingForeign) {
        setCoach((prev) => (prev ? { ...prev, notes: notesRef.current } : prev));
      }
      dirtyRef.current = false;
      setSaveState("saved");
      onSend(buildScopedPrompt("enrich"), { hiddenHistory: true });
      setPickingScope(false);
    } catch {
      setSaveState("error");
    } finally {
      setBusy(false);
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l-2 border-sky-500/35",
        "bg-gradient-to-b from-sky-500/8 via-background to-background",
        // Mobile: full-screen overlay so chat remains underneath with an obvious back control.
        "fixed inset-0 z-40 w-full md:static md:z-auto md:w-1/2 md:max-w-[50%]",
      )}
      data-testid="notes-drawer"
      aria-label={t("thread.coach.drawer.notesTitle")}
    >
      <div className="flex items-start justify-between gap-3 border-b-2 border-sky-500/25 bg-sky-500/10 px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 md:hidden">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2.5 text-[13px]"
              onClick={() => onOpenChange(false)}
              data-testid="notes-back-to-chat"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("thread.coach.drawer.backToChat")}
            </Button>
          </div>
          <h2 className="text-[17px] font-semibold">{t("thread.coach.drawer.notesTitle")}</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("thread.coach.drawer.notesDescSplit")}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={() => onOpenChange(false)}
          aria-label={t("thread.coach.hideNotes")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {coachError || loadError ? (
        <p className="shrink-0 px-4 pt-3 text-[13px] text-destructive">
          {loadError || coachError}
        </p>
      ) : null}

      {editingForeign && resolvedNotesPath ? (
        <p
          className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-900 dark:text-amber-100"
          data-testid="notes-foreign-banner"
        >
          {t("thread.coach.drawer.editingForeign", { path: resolvedNotesPath })}
        </p>
      ) : null}

      {!sessionKey ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">
          {t("thread.coach.drawer.needSession")}
        </p>
      ) : (
        <>
          <div className="shrink-0 space-y-2 border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
              <span className="truncate font-medium text-foreground/80">
                {resolvedNotesPath || t("thread.coach.noTopic")}
              </span>
              <span>
                {saveState === "saving"
                  ? t("thread.coach.saving")
                  : saveState === "saved"
                    ? t("thread.coach.saved")
                    : saveState === "error"
                      ? t("thread.coach.saveError")
                      : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "edit" ? "secondary" : "ghost"}
                className="h-8 gap-1"
                onClick={() => setMode("edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("thread.coach.drawer.editMode")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "preview" ? "secondary" : "ghost"}
                className="h-8 gap-1"
                onClick={() => setMode("preview")}
              >
                <Eye className="h-3.5 w-3.5" />
                {t("thread.coach.drawer.previewMode")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pickingScope ? "secondary" : "outline"}
                className="h-8 gap-1"
                onClick={() => setPickingScope((v) => !v)}
              >
                <ListChecks className="h-3.5 w-3.5" />
                {t("thread.coach.drawer.pickScope")}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {pickingScope ? (
              <div className="space-y-2" data-testid="notes-scope-picker">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium">
                    {t("thread.coach.drawer.scopeTitle", { count: selectedIds.size })}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[12px]"
                      onClick={() =>
                        setSelectedIds(
                          selectIdsWithinBudget(chatChoices, NOTES_SCOPE_CHAR_LIMIT, chatChoices.length),
                        )
                      }
                    >
                      {t("thread.coach.drawer.selectAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      {t("thread.coach.drawer.clearAll")}
                    </Button>
                  </div>
                </div>
                {scopeStats.truncated ? (
                  <p
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-900 dark:text-amber-100"
                    data-testid="notes-scope-truncated"
                  >
                    {t("thread.coach.drawer.scopeTruncated", {
                      limit: NOTES_SCOPE_CHAR_LIMIT,
                      used: scopeStats.usedIds.length,
                      selected: selectedIds.size,
                    })}
                  </p>
                ) : null}
                {chatChoices.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {t("thread.coach.drawer.scopeEmpty")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {chatChoices.map((m) => {
                      const checked = selectedIds.has(m.id);
                      return (
                        <li key={m.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer gap-2 rounded-xl border px-2.5 py-2 text-[12px]",
                              checked
                                ? "border-sky-500/45 bg-sky-500/10"
                                : "border-border/70 bg-muted/30",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={() => toggleId(m.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-semibold text-foreground/80">
                                {m.role === "user"
                                  ? t("thread.coach.drawer.roleUser")
                                  : t("thread.coach.drawer.roleAssistant")}
                              </span>
                              <span className="mt-0.5 block text-muted-foreground">
                                {clip(m.content)}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : mode === "edit" ? (
              <RichNotesEditor
                value={notes}
                onChange={(next) => {
                  setNotes(next);
                  scheduleSave(next);
                }}
                disabled={disabled || !canEdit}
                placeholder={t("thread.coach.notesPlaceholder")}
              />
            ) : notes.trim() ? (
              <MarkdownText text={notes} className="prose prose-sm dark:prose-invert max-w-none" />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {t("thread.coach.drawer.emptyPreview")}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5"
                disabled={disabled || busy || !resolvedNotesPath}
                onClick={onGenerate}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {pickingScope
                  ? t("thread.coach.drawer.confirmGenerate")
                  : t("thread.coach.generateNotes")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 gap-1.5"
                disabled={disabled || busy || !resolvedNotesPath}
                onClick={() => void onEnrich()}
              >
                <NotebookPen className="h-3.5 w-3.5" />
                {pickingScope
                  ? t("thread.coach.drawer.confirmEnrich")
                  : t("thread.coach.enrichNotes")}
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
