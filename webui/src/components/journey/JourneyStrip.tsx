import { Check, MessageSquare, NotebookPen, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type JourneyStepId = "goal" | "session" | "chat" | "notes";

interface JourneyStripProps {
  hasActiveGoal: boolean;
  hasSession: boolean;
  hasMessages: boolean;
  notesVisited: boolean;
  hasNotesContent?: boolean;
  checkedInToday?: boolean;
  /** When true, hide Notes/Check-in side buttons (they live in the header). */
  compactActions?: boolean;
  onConfirmGoal?: () => void;
  onGoalChoice?: (label: string) => void;
  onFocusSessions?: () => void;
  onFocusChat?: () => void;
  onOpenNotes?: () => void;
  onOpenCheckin?: () => void;
  className?: string;
}

export function JourneyStrip({
  hasActiveGoal,
  hasSession,
  hasMessages,
  notesVisited,
  hasNotesContent = false,
  checkedInToday = false,
  compactActions = false,
  onConfirmGoal,
  onGoalChoice,
  onFocusSessions,
  onFocusChat,
  onOpenNotes,
  onOpenCheckin,
  className,
}: JourneyStripProps) {
  const { t } = useTranslation();
  const notesDone = notesVisited || hasNotesContent || checkedInToday;

  const steps: Array<{
    id: JourneyStepId;
    label: string;
    done: boolean;
    active: boolean;
    icon: typeof Target;
    onClick?: () => void;
  }> = [
    {
      id: "goal",
      label: t("thread.journey.goal"),
      done: hasActiveGoal,
      active: !hasActiveGoal,
      icon: Target,
      onClick: onConfirmGoal,
    },
    {
      id: "session",
      label: t("thread.journey.session"),
      done: hasSession,
      active: hasActiveGoal && !hasSession,
      icon: MessageSquare,
      // Always allow focusing the session rail so users can switch chats.
      onClick: onFocusSessions,
    },
    {
      id: "chat",
      label: t("thread.journey.chat"),
      done: hasMessages,
      active: hasActiveGoal && hasSession && !hasMessages,
      icon: MessageSquare,
      onClick: onFocusChat,
    },
    {
      id: "notes",
      label: t("thread.journey.notes"),
      done: notesDone,
      active: hasActiveGoal && hasSession && hasMessages && !notesDone,
      icon: NotebookPen,
      onClick: onOpenNotes,
    },
  ];

  const goalChoices = [
    t("thread.journey.choiceLearn"),
    t("thread.journey.choiceOffice"),
    t("thread.journey.choiceExplain"),
  ];

  const showSideActions = !compactActions && (!!onOpenNotes || !!onOpenCheckin);

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-2xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/5 px-3 py-3 shadow-sm",
        className,
      )}
      data-testid="journey-strip"
      role="navigation"
      aria-label={t("thread.journey.aria")}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span className="mx-0.5 hidden h-0.5 w-4 rounded-full bg-sky-500/40 sm:block" aria-hidden />
              ) : null}
              <button
                type="button"
                disabled={!step.onClick}
                onClick={step.onClick}
                data-testid={`journey-step-${step.id}`}
                data-done={step.done ? "true" : "false"}
                data-active={step.active ? "true" : "false"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  step.done
                    && "bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-500/40 dark:text-emerald-200",
                  !step.done && step.active
                    && "bg-sky-500/20 text-sky-900 ring-2 ring-sky-500/50 dark:text-sky-100",
                  !step.done && !step.active && "bg-muted/50 text-muted-foreground ring-1 ring-border",
                  step.onClick && "hover:brightness-95",
                  !step.onClick && "cursor-default",
                )}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
            </li>
          );
        })}
        {showSideActions ? (
          <li className="ml-auto flex shrink-0 items-center gap-1.5">
            {onOpenNotes ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2.5 text-[13px]"
                onClick={onOpenNotes}
              >
                <NotebookPen className="h-3.5 w-3.5" />
                {t("thread.journey.openNotes")}
              </Button>
            ) : null}
            {onOpenCheckin ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 px-2.5 text-[13px]"
                onClick={onOpenCheckin}
              >
                {checkedInToday
                  ? t("thread.coach.checkedIn")
                  : t("thread.journey.openCheckin")}
              </Button>
            ) : null}
          </li>
        ) : null}
      </ol>

      {!hasActiveGoal && onGoalChoice ? (
        <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-sky-500/30 pt-2.5" data-testid="journey-goal-choices">
          <span className="w-full text-[13px] font-medium text-sky-900/80 dark:text-sky-100/90">
            {t("thread.journey.waitingGoal")}
          </span>
          {goalChoices.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onGoalChoice(label)}
              className={cn(
                "rounded-full border-2 border-sky-500/40 bg-background px-3.5 py-1.5",
                "text-[13px] font-medium text-foreground shadow-sm",
                "transition-colors hover:bg-sky-500/10",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
