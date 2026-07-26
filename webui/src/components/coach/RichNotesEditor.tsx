import { useEffect, useRef, type ClipboardEvent } from "react";
import {
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Indent,
  List,
  ListOrdered,
  ListTree,
  Outdent,
  Palette,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  applyHeading,
  clearHighlightFromSelection,
  htmlToMarkdown,
  indentBlock,
  insertSanitizedPaste,
  markdownToHtml,
  outdentBlock,
  upsertTableOfContents,
  wrapSelectionAsFontColor,
  wrapSelectionAsHighlight,
  type FontColor,
  type HighlightColor,
} from "@/lib/rich-notes";
import { cn } from "@/lib/utils";

interface RichNotesEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const HIGHLIGHTS: HighlightColor[] = ["yellow", "green", "pink"];
const FONT_COLORS: FontColor[] = ["red", "blue", "orange", "purple", "teal"];

export function RichNotesEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
}: RichNotesEditorProps) {
  const { t, i18n } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastMd = useRef(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastMd.current) return;
    lastMd.current = value;
    el.innerHTML = markdownToHtml(value);
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = markdownToHtml(value);
      lastMd.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, []);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    lastMd.current = md;
    onChange(md);
  };

  const emitTimer = useRef<number | null>(null);

  const scheduleEmit = () => {
    if (emitTimer.current !== null) window.clearTimeout(emitTimer.current);
    emitTimer.current = window.setTimeout(() => {
      emitTimer.current = null;
      emit();
    }, 900);
  };

  const flushEmit = () => {
    if (emitTimer.current !== null) {
      window.clearTimeout(emitTimer.current);
      emitTimer.current = null;
    }
    emit();
  };

  useEffect(() => {
    return () => {
      if (emitTimer.current !== null) window.clearTimeout(emitTimer.current);
    };
  }, []);

  const run = (fn: () => void) => {
    if (disabled) return;
    fn();
    editorRef.current?.focus();
    flushEmit();
  };

  const tocTitle = i18n.language?.toLowerCase().startsWith("zh") ? "目录" : "TOC";

  const insertToc = () => {
    if (disabled) return;
    const next = upsertTableOfContents(lastMd.current || value, tocTitle);
    lastMd.current = next;
    if (editorRef.current) editorRef.current.innerHTML = markdownToHtml(next);
    onChange(next);
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (html) insertSanitizedPaste(html, true);
    else if (text) insertSanitizedPaste(text, false);
    flushEmit();
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-sky-500/25 bg-gradient-to-b from-sky-500/5 to-background shadow-sm",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b-2 border-sky-500/20 bg-sky-500/5 px-2 py-1.5">
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.bold")}
          onClick={() => run(() => document.execCommand("bold"))}
        >
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.h1")}
          onClick={() => run(() => applyHeading(1))}
        >
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.h2")}
          onClick={() => run(() => applyHeading(2))}
        >
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.h3")}
          onClick={() => run(() => applyHeading(3))}
        >
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <Sep />
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.bulletList")}
          onClick={() => run(() => document.execCommand("insertUnorderedList"))}
        >
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.numberedList")}
          onClick={() => run(() => document.execCommand("insertOrderedList"))}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.indent")}
          onClick={() => run(() => indentBlock())}
        >
          <Indent className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.outdent")}
          onClick={() => run(() => outdentBlock())}
        >
          <Outdent className="h-4 w-4" />
        </ToolBtn>
        <Sep />
        {HIGHLIGHTS.map((color) => (
          <ToolBtn
            key={color}
            disabled={disabled}
            label={t(`thread.coach.richNotes.highlight.${color}`)}
            onClick={() => run(() => wrapSelectionAsHighlight(color))}
          >
            <Highlighter
              className={cn(
                "h-4 w-4",
                color === "yellow" && "text-amber-500",
                color === "green" && "text-emerald-500",
                color === "pink" && "text-pink-500",
              )}
            />
          </ToolBtn>
        ))}
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.clearHighlight")}
          onClick={() => run(() => clearHighlightFromSelection())}
        >
          <Eraser className="h-4 w-4" />
        </ToolBtn>
        <Sep />
        {FONT_COLORS.map((color) => (
          <ToolBtn
            key={color}
            disabled={disabled}
            label={t(`thread.coach.richNotes.fontColor.${color}`)}
            onClick={() => run(() => wrapSelectionAsFontColor(color))}
          >
            <Palette
              className={cn(
                "h-4 w-4",
                color === "red" && "text-red-500",
                color === "blue" && "text-blue-500",
                color === "orange" && "text-orange-500",
                color === "purple" && "text-purple-500",
                color === "teal" && "text-teal-500",
              )}
            />
          </ToolBtn>
        ))}
        <Sep />
        <ToolBtn
          disabled={disabled}
          label={t("thread.coach.richNotes.insertToc")}
          onClick={insertToc}
        >
          <ListTree className="h-4 w-4" />
          <span className="text-[12px]">{t("thread.coach.richNotes.toc")}</span>
        </ToolBtn>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        aria-label={placeholder || t("thread.coach.notesTitle")}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={scheduleEmit}
        onBlur={flushEmit}
        onPaste={onPaste}
        className={cn(
          "min-h-[12rem] flex-1 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed outline-none",
          "[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[22px] [&_h1]:font-semibold",
          "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[18px] [&_h2]:font-semibold",
          "[&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:text-[16px] [&_h3]:font-semibold",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-sky-400/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          "[&_.nb-indent]:pl-6",
          "[&_.nb-mark-yellow]:bg-amber-200/90 [&_.nb-mark-yellow]:dark:bg-amber-500/35",
          "[&_.nb-mark-green]:bg-emerald-200/90 [&_.nb-mark-green]:dark:bg-emerald-500/35",
          "[&_.nb-mark-pink]:bg-pink-200/90 [&_.nb-mark-pink]:dark:bg-pink-500/35",
          "[&_.nb-fg-red]:text-red-600 [&_.nb-fg-blue]:text-blue-600",
          "[&_.nb-fg-orange]:text-orange-600 [&_.nb-fg-purple]:text-purple-600 [&_.nb-fg-teal]:text-teal-600",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          disabled && "opacity-60",
        )}
      />
    </div>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}

function ToolBtn({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 gap-1 px-1.5"
      disabled={disabled}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
