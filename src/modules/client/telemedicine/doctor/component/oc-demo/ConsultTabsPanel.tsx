/**
 * @file ConsultTabsPanel.tsx
 * @description Below-video tab strip on the oc-demo page — Live Transcript /
 * AI Assistant / Patient Chat / Shared Content, plus the quick-prompt chips
 * and message input. All content is mock data (see mockOcData.ts); this is
 * the one part of the reference design that stays a static prototype even
 * though the video tile above it is a real LiveKit room.
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_QUICK_PROMPTS, MOCK_TRANSCRIPT } from "./mockOcData";

const TABS = ["Live Transcript", "AI Assistant", "Patient Chat", "Shared Content"] as const;

/** Renders the below-video transcript/chat tab strip. */
export function ConsultTabsPanel() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <Tabs defaultValue={TABS[0]} className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between gap-2">
          <TabsList variant="line">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="text-xs">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <Select defaultValue="en">
            <SelectTrigger size="sm" className="w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent
          value="Live Transcript"
          className="flex-1 min-h-0 overflow-y-auto space-y-3 mt-2 pr-1"
        >
          {MOCK_TRANSCRIPT.map((line, index) => (
            <div key={index} className="flex items-start gap-2">
              <Avatar size="sm">
                <AvatarFallback
                  className="text-[10px] font-semibold"
                  style={{
                    backgroundColor: line.speaker === "doctor" ? "#93c5fd" : "#fda4af",
                  }}
                >
                  {line.speaker === "doctor" ? "Dr" : "Pt"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold">{line.name}</span>
                  <span className="text-[11px] text-muted-foreground">{line.time}</span>
                </div>
                <div className="text-sm rounded-lg bg-muted/60 px-2.5 py-1.5 mt-0.5">
                  {line.text}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="AI Assistant" className="flex-1 min-h-0 mt-2">
          <p className="text-sm text-muted-foreground">
            Ask DrGodly AI about this consultation — differential diagnosis,
            guideline lookups, or patient education handouts.
          </p>
        </TabsContent>
        <TabsContent value="Patient Chat" className="flex-1 min-h-0 mt-2">
          <p className="text-sm text-muted-foreground">No chat messages yet.</p>
        </TabsContent>
        <TabsContent value="Shared Content" className="flex-1 min-h-0 mt-2">
          <p className="text-sm text-muted-foreground">
            Nothing shared with the patient yet during this visit.
          </p>
        </TabsContent>
      </Tabs>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {MOCK_QUICK_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMessage(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>

      {/* Message input */}
      <form
        className="flex items-center gap-1.5 shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage("");
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask DrGodly or type a message…"
          className="h-9 text-sm"
        />
        <Button type="submit" size="icon" className="size-9 shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
