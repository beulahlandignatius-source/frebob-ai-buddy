import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, LoadingSkeleton, ErrorState } from "@/components/dash";
import { chatSample, chatSuggestions, type ChatMsg } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — FreBob" },
      { name: "description", content: "Ask FreBob about your sales, stock, customers and money in plain language." },
      { property: "og:title", content: "AI Assistant — FreBob" },
      { property: "og:description", content: "Your smart business assistant, ready to help." },
    ],
  }),
  component: AIAssistant,
});

function AIAssistant() {
  const [messages, setMessages] = useState<ChatMsg[]>(chatSample);
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "thinking" | "error">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const now = new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: t, time: now }]);
    setInput("");
    setState("thinking");
    setTimeout(() => {
      setState("idle");
      setMessages((m) => [...m, {
        id: crypto.randomUUID(), role: "assistant",
        text: "Based on your records, here's a quick summary — this is a prototype so the answers are illustrative for now.",
        time: now,
      }]);
    }, 1100);
  };

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader eyebrow="AI Assistant" title="Ask FreBob" subtitle="Your smart business assistant" />

        <div className="rounded-[24px] border border-secondary bg-card overflow-hidden flex flex-col h-[calc(100vh-260px)] min-h-[440px]">
          {/* Header strip */}
          <div className="glass-card px-5 py-4 border-b border-secondary/70">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-primary">FreBob</p>
                <p className="text-[11px] text-muted-foreground">Reads your live business memory</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-tinted)]/40">
            {messages.map((m) => <Bubble key={m.id} m={m} />)}
            {state === "thinking" && (
              <div className="max-w-[75%]">
                <LoadingSkeleton rows={1} />
              </div>
            )}
            {state === "error" && <ErrorState onRetry={() => setState("idle")} message="Couldn't reach the assistant." />}
          </div>

          {/* Suggestions */}
          {messages.length <= 3 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 border-t border-secondary/70 pt-3">
              {chatSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-secondary bg-card hover:border-primary/30 hover:bg-secondary/50 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t border-secondary/70 bg-card flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about sales, stock, customers…"
              className="flex-1 h-11 px-4 rounded-full border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || state === "thinking"}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function Bubble({ m }: { m: ChatMsg }) {
  const user = m.role === "user";
  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-[18px] px-4 py-3 text-sm leading-relaxed",
        user
          ? "brand-gradient text-primary-foreground rounded-br-md"
          : "bg-card border border-secondary text-foreground rounded-bl-md shadow-card",
      )}>
        <p>{m.text}</p>
        <p className={cn("text-[10px] mt-1", user ? "text-white/70" : "text-muted-foreground")}>{m.time}</p>
      </div>
    </div>
  );
}
