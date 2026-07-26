import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { postCoachCheckin } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClient } from "@/providers/ClientProvider";
import { useCoach } from "@/providers/CoachProvider";

interface CheckinDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onCheckedIn?: () => void;
}

function lastSevenDays(todayIso: string): string[] {
  const today = new Date(`${todayIso}T12:00:00`);
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function weekdayLabel(iso: string, locale: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "short" });
}

export function CheckinDrawer({
  open,
  onOpenChange,
  disabled = false,
  onCheckedIn,
}: CheckinDrawerProps) {
  const { t, i18n } = useTranslation();
  const { token } = useClient();
  const { sessionKey, coach, error: coachError, refresh } = useCoach();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const today = coach?.today || new Date().toISOString().slice(0, 10);
  const week = useMemo(() => lastSevenDays(today), [today]);
  const checkedSet = useMemo(
    () => new Set(coach?.checkin_days ?? []),
    [coach?.checkin_days],
  );
  const topic = coach?.topic;
  const already = !!coach?.checked_in_today;

  const onCheckin = async () => {
    if (!sessionKey || !topic || busy || already) return;
    setBusy(true);
    try {
      await postCoachCheckin(token, sessionKey, note.trim() || undefined);
      setNote("");
      await refresh();
      onCheckedIn?.();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const displayError = error || coachError;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l-2 border-emerald-500/30 p-0 sm:max-w-md"
        data-testid="checkin-drawer"
      >
        <div className="border-b-2 border-emerald-500/25 bg-emerald-500/10 px-5 py-4 pr-12">
          <SheetTitle className="text-[18px] font-semibold">
            {t("thread.coach.drawer.checkinTitle")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-[13px]">
            {t("thread.coach.drawer.checkinDesc")}
          </SheetDescription>
        </div>
        <div className="flex flex-col gap-5 px-5 py-5">
          {displayError ? <p className="text-[13px] text-destructive">{displayError}</p> : null}
          {!sessionKey ? (
            <p className="text-[13px] text-muted-foreground">{t("thread.coach.drawer.needSession")}</p>
          ) : !topic ? (
            <p className="text-[13px] text-muted-foreground">{t("thread.coach.drawer.needTopic")}</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2">
                {week.map((iso) => {
                  const done = checkedSet.has(iso) || (iso === today && already);
                  const isToday = iso === today;
                  return (
                    <div
                      key={iso}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center ring-1",
                        isToday
                          ? "bg-sky-500/15 ring-sky-500/40"
                          : "bg-muted/50 ring-border/70",
                      )}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {weekdayLabel(iso, i18n.language)}
                      </span>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold",
                          done
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-background text-muted-foreground ring-1 ring-border",
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : Number(iso.slice(8))}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className={cn(
                  "rounded-2xl border-2 px-4 py-6 text-center shadow-sm",
                  already
                    ? "border-emerald-500/50 bg-emerald-500/15"
                    : "border-sky-500/35 bg-sky-500/10",
                )}
              >
                <p className="text-[15px] font-semibold">
                  {already
                    ? t("thread.coach.drawer.checkedInToday")
                    : t("thread.coach.drawer.checkinPrompt")}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">{today}</p>
                {!already ? (
                  <>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={disabled || busy}
                      placeholder={t("thread.coach.checkinPlaceholder")}
                      className={cn(
                        "mt-4 h-10 w-full rounded-xl border-2 border-border/80 bg-background px-3",
                        "text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    />
                    <Button
                      type="button"
                      className="mt-3 h-11 w-full gap-2 text-[15px]"
                      disabled={disabled || busy}
                      onClick={() => void onCheckin()}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("thread.coach.checkin")}
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
