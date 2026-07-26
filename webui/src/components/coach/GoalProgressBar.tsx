import { Library } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoalStateWsPayload } from "@/lib/types";
import { useCoachOptional } from "@/providers/CoachProvider";

interface GoalProgressBarProps {
  goalState?: GoalStateWsPayload;
  onOpenHub?: () => void;
  className?: string;
}

/**
 * Progress-only strip. Notes / check-in CTAs live on JourneyStrip to avoid duplication.
 */
export function GoalProgressBar({
  goalState,
  onOpenHub,
  className,
}: GoalProgressBarProps) {
  const { t } = useTranslation();
  const coachApi = useCoachOptional();
  const coach = coachApi?.coach ?? null;

  if (!goalState?.active) return null;

  const progress = coach?.progress;
  const ratioPct = Math.round((progress?.ratio ?? 0) * 100);
  const stageLabel =
    progress?.stage_label
    || goalState.ui_summary
    || t("thread.composer.goalStateFallback");

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-sky-500/5 px-3 py-2.5 shadow-sm",
        className,
      )}
      data-testid="goal-progress-bar"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
          <span className="truncate font-semibold text-foreground">
            {t("thread.coach.progressLabel", { label: stageLabel })}
          </span>
          <span className="shrink-0 tabular-nums font-medium">
            {progress && progress.total > 0
              ? t("thread.coach.progressCount", {
                  done: progress.done,
                  total: progress.total,
                  pct: ratioPct,
                })
              : t("thread.coach.progressEmpty")}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted ring-1 ring-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, ratioPct))}%` }}
          />
        </div>
      </div>
      {onOpenHub ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 gap-1 px-2.5 text-[13px]"
          onClick={onOpenHub}
        >
          <Library className="h-4 w-4" aria-hidden />
          {t("thread.coach.hub.open")}
        </Button>
      ) : null}
    </div>
  );
}
