/**
 * SessionGreeting component.
 *
 * Layer: client / emr-chat / components
 *
 * Empty-state screen shown when no messages exist yet (new chat or blank session).
 * Displays a time-aware greeting and a 2-column grid of suggested workflow prompts
 * the user can click to pre-fill the input.
 */

"use client";

import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Suggested workflow starters shown in the greeting grid. */
const SUGGESTIONS = [
  {
    label: "Register a patient",
    prompt: "I need to register a new patient",
    icon: "👤",
  },
  {
    label: "Book an appointment",
    prompt: "Book an appointment for a patient",
    icon: "📅",
  },
  {
    label: "Record vitals",
    prompt: "Record vitals for a patient",
    icon: "❤️",
  },
  {
    label: "Prescribe medication",
    prompt: "Create a prescription for a patient",
    icon: "💊",
  },
] as const;

/**
 * Returns a time-aware greeting string.
 *
 * @returns "Good morning", "Good afternoon", or "Good evening".
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface SessionGreetingProps {
  /** Called when the user clicks a suggestion chip. Receives the prompt text. */
  onSuggestion: (prompt: string) => void;
}

/**
 * Empty-state greeting with quick-start workflow suggestions.
 *
 * @param onSuggestion - Callback with the selected prompt string.
 */
export function SessionGreeting({ onSuggestion }: SessionGreetingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Stethoscope className="size-7 text-primary" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold">{getGreeting()}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Describe what you need and I&apos;ll guide you through the FHIR workflow.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSuggestion(s.prompt)}
          >
            <CardContent className="p-3 text-left">
              <div className="text-lg mb-1">{s.icon}</div>
              <p className="text-xs font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => onSuggestion("What can you help me with?")}
      >
        Or ask me anything
      </Button>
    </div>
  );
}
