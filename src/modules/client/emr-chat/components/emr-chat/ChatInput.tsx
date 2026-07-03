/**
 * ChatInput — textarea + send button + optional skip-step bar.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Renders the bottom input area of the EMR chat. Includes:
 *   - A resizable Textarea that grows up to 8 lines.
 *   - An icon Send button that is disabled while loading or input is empty.
 *   - A "Skip this step" bar that appears above the input when the current
 *     workflow step is optional and the AI is not loading.
 *
 * Enter submits; Shift+Enter inserts a newline.
 */

import { Send, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  /** Controlled input value. */
  value: string;
  /** Setter forwarded to the Zustand store's setInput. */
  onChange: (value: string) => void;
  /** Called when the user submits (button click or Enter). */
  onSend: () => void;
  loading: boolean;
  /** Ref for programmatic focus (e.g., after clicking a suggestion chip). */
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  /** When true, the "Skip this step" bar is shown above the input. */
  currentStepIsOptional: boolean;
  /** Called when the user clicks "Skip this step". */
  onSkip: () => void;
}

/**
 * Controlled chat input area with an optional skip-step affordance.
 *
 * @param props.value                 - Current textarea value.
 * @param props.onChange              - Value change handler.
 * @param props.onSend                - Submit handler.
 * @param props.loading               - Disables the input and shows a spinner.
 * @param props.inputRef              - Ref for programmatic focus.
 * @param props.currentStepIsOptional - Shows the skip bar when true.
 * @param props.onSkip                - Skip-step handler.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  loading,
  inputRef,
  currentStepIsOptional,
  onSkip,
}: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <>
      {/* Skip optional step bar */}
      {currentStepIsOptional && !loading && (
        <div className="border-t border-border bg-background px-4 py-2 shrink-0">
          <div className="max-w-4xl mx-auto flex justify-end">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <SkipForward className="size-4 mr-2" />
              Skip this step
            </Button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="border-t border-border bg-background p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try "create a patient" or ask anything…'
            disabled={loading}
            rows={1}
            className="flex-1 min-h-0 max-h-32 resize-none"
          />
          <Button
            onClick={onSend}
            disabled={loading || !value.trim()}
            size="icon"
            className="shrink-0 size-10"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
