import { useCallback, useEffect, useState } from "react";
import { Library, NotebookPen, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCoachHub, type CoachHubPayload, type CoachHubTopic } from "@/lib/api";
import { useClient } from "@/providers/ClientProvider";
import { cn } from "@/lib/utils";

interface ProgressHubDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionKey: string | null;
  onOpenNotesPath?: (path: string) => void;
}

function formatUpdated(ts: number, locale: string): string {
  try {
    return new Date(ts * 1000).toLocaleString(locale);
  } catch {
    return String(ts);
  }
}

function TopicCard({
  topic,
  locale,
  onOpenNotes,
}: {
  topic: CoachHubTopic;
  locale: string;
  onOpenNotes?: (path: string) => void;
}) {
  const { t } = useTranslation();
  const pct = Math.round((topic.progress?.ratio ?? 0) * 100);
  return (
    <article
      className="rounded-2xl border-2 border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-3.5"
      data-testid="coach-hub-topic"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold">{topic.topic}</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {topic.progress?.stage_label
              || (topic.has_path
                ? t("thread.coach.hub.noStage")
                : t("thread.coach.hub.noPath"))}
          </p>
        </div>
        <span className="shrink-0 tabular-nums text-[12px] font-medium">
          {topic.progress && topic.progress.total > 0
            ? t("thread.coach.progressCount", {
                done: topic.progress.done,
                total: topic.progress.total,
                pct,
              })
            : t("thread.coach.progressEmpty")}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted ring-1 ring-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      {topic.has_notes ? (
        <div className="mt-3 rounded-xl border border-sky-500/20 bg-background/70 px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-700 dark:text-sky-300">
              <NotebookPen className="h-3.5 w-3.5" />
              {t("thread.coach.hub.notesLabel")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatUpdated(topic.updated_at, locale)}
            </span>
          </div>
          <p className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
            {topic.notes_preview || t("thread.coach.hub.emptyNotes")}
          </p>
          {onOpenNotes && topic.paths.notes ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-[12px]"
              onClick={() => onOpenNotes(topic.paths.notes)}
            >
              {t("thread.coach.hub.openNotes")}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-muted-foreground">{t("thread.coach.hub.noNotesYet")}</p>
      )}
    </article>
  );
}

export function ProgressHubDrawer({
  open,
  onOpenChange,
  sessionKey,
  onOpenNotesPath,
}: ProgressHubDrawerProps) {
  const { t, i18n } = useTranslation();
  const { token } = useClient();
  const [hub, setHub] = useState<CoachHubPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionKey) return;
    setLoading(true);
    try {
      setHub(await fetchCoachHub(token, sessionKey));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionKey, token]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l-2 border-violet-500/30 p-0 sm:max-w-lg"
        data-testid="progress-hub-drawer"
      >
        <div className="border-b-2 border-violet-500/25 bg-violet-500/10 px-5 py-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-[18px] font-semibold">
            <Library className="h-5 w-5" />
            {t("thread.coach.hub.title")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[13px]">
            {t("thread.coach.hub.desc")}
          </SheetDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {!sessionKey ? (
            <p className="text-[13px] text-muted-foreground">{t("thread.coach.drawer.needSession")}</p>
          ) : loading && !hub ? (
            <p className="text-[13px] text-muted-foreground">{t("thread.coach.hub.loading")}</p>
          ) : error ? (
            <p className="text-[13px] text-destructive">{error}</p>
          ) : hub ? (
            <>
              <div className="flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1">
                  {t("thread.coach.hub.topicCount", { count: hub.topic_count })}
                </span>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1">
                  {t("thread.coach.hub.notesCount", { count: hub.notes_count })}
                </span>
              </div>
              {hub.active_goals_summary ? (
                <div className="rounded-2xl border-2 border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-200">
                    {t("thread.coach.hub.activeGoals")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                    {hub.active_goals_summary}
                  </p>
                </div>
              ) : null}
              {hub.topics.length === 0 && hub.orphan_notes.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t("thread.coach.hub.empty")}</p>
              ) : null}
              <div className="space-y-3">
                {hub.topics.map((topic) => (
                  <TopicCard
                    key={topic.topic}
                    topic={topic}
                    locale={i18n.language}
                    onOpenNotes={onOpenNotesPath}
                  />
                ))}
              </div>
              {hub.orphan_notes.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold">{t("thread.coach.hub.orphanTitle")}</h3>
                  {hub.orphan_notes.map((note) => (
                    <article
                      key={note.path}
                      className={cn(
                        "rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="truncate text-[11px]">{note.path}</code>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatUpdated(note.updated_at, i18n.language)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-3 text-[12px] text-muted-foreground">
                        {note.notes_preview}
                      </p>
                      {onOpenNotesPath ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-7 px-2 text-[12px]"
                          onClick={() => onOpenNotesPath(note.path)}
                        >
                          {t("thread.coach.hub.openNotes")}
                        </Button>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          <div className="flex justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
              {t("thread.coach.hub.close")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
