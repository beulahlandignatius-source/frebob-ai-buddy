// FreBob AI Business Copilot — Batch 4.
// Chat surface grounded on approved Business Memory. Uses Gemini via the
// server function when available, falls back to a deterministic client
// engine so the assistant never blocks the app.

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader } from "@/components/dash";
import {
  ChatBubble,
  ChatInput,
  ConversationHistory,
  EmptyChatState,
  AIThinkingIndicator,
  SuggestedQuestionCard,
  SummaryCard,
  suggestionCatalog,
  type CopilotMessage,
  type ConversationSummary,
} from "@/components/copilot";
import {
  buildSnapshot,
  mockAnswer,
  COPILOT_LANGUAGES,
  type CopilotLanguage,
  type BusinessSnapshot,
} from "@/lib/copilot-context";
import { askCopilot } from "@/lib/copilot.functions";
import { listApprovedRecords } from "@/lib/records-store";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Copilot — FreBob" },
      { name: "description", content: "Ask FreBob about your sales, stock, customers and money. Grounded on approved records." },
      { property: "og:title", content: "AI Copilot — FreBob" },
      { property: "og:description", content: "Your smart business assistant, grounded on real approved records." },
    ],
  }),
  component: AIAssistantPage,
});

type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: CopilotMessage[];
};

const STORAGE_KEY = "frebob.copilot.threads.v1";

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch { return []; }
}
function saveThreads(rows: Thread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
function newThread(): Thread {
  return { id: `chat_${Date.now().toString(36)}`, title: "New chat", updatedAt: Date.now(), messages: [] };
}
function nowTime() {
  return new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}
function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function AIAssistantPage() {
  const ask = useServerFn(askCopilot);
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = loadThreads();
    return existing[0]?.id ?? "";
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState<CopilotLanguage>("english");
  const [snapshot, setSnapshot] = useState<BusinessSnapshot>(() => buildSnapshot([]));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensure at least one thread exists (idempotent bootstrap)
  useEffect(() => {
    if (threads.length === 0) {
      const t = newThread();
      setThreads([t]);
      setActiveId(t.id);
      saveThreads([t]);
    } else if (!threads.find((t) => t.id === activeId)) {
      setActiveId(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snapshot rebuilds when route mounts (fresh approved records)
  useEffect(() => {
    setSnapshot(buildSnapshot(listApprovedRecords()));
  }, []);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const messages = active?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const persist = useCallback((next: Thread[]) => {
    setThreads(next);
    saveThreads(next);
  }, []);

  const updateActive = useCallback((updater: (t: Thread) => Thread) => {
    setThreads((prev) => {
      const next = prev.map((t) => (t.id === activeId ? updater(t) : t));
      saveThreads(next);
      return next;
    });
  }, [activeId]);

  const send = useCallback(async (raw: string) => {
    const question = raw.trim();
    if (!question || thinking) return;

    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: question,
      time: nowTime(),
    };

    // Refresh snapshot at send time
    const snap = buildSnapshot(listApprovedRecords());
    setSnapshot(snap);

    updateActive((t) => ({
      ...t,
      messages: [...t.messages, userMsg],
      title: t.messages.length === 0 ? question.slice(0, 40) : t.title,
      updatedAt: Date.now(),
    }));
    setInput("");
    setThinking(true);

    let assistant: CopilotMessage;
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.text }));
      const result = await ask({ data: { question, language, snapshot: snap, history } });

      if (result.mode === "ai" && result.text) {
        assistant = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.text,
          time: nowTime(),
          evidence: result.evidence,
          mode: "ai",
        };
      } else {
        const fallback = mockAnswer(question, snap, language);
        assistant = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: fallback.text,
          time: nowTime(),
          evidence: fallback.evidence,
          mode: "mock",
        };
      }
    } catch {
      const fallback = mockAnswer(question, snap, language);
      assistant = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: fallback.text || "FreBob couldn't answer right now. Please try again.",
        time: nowTime(),
        evidence: fallback.evidence,
        mode: "mock",
        isError: !fallback.hasData && snap.totalApproved === 0 ? false : false,
      };
    }

    updateActive((t) => ({ ...t, messages: [...t.messages, assistant], updatedAt: Date.now() }));
    setThinking(false);
  }, [ask, language, messages, thinking, updateActive]);

  const handleNew = useCallback(() => {
    const t = newThread();
    persist([t, ...threads]);
    setActiveId(t.id);
    setShowHistory(false);
    setInput("");
  }, [persist, threads]);

  const handleClear = useCallback(() => {
    updateActive((t) => ({ ...t, messages: [], title: "New chat", updatedAt: Date.now() }));
  }, [updateActive]);

  const historyItems: ConversationSummary[] = useMemo(
    () => threads
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((t) => ({ id: t.id, title: t.title || "New chat", updatedAt: relTime(t.updatedAt), count: t.messages.length })),
    [threads],
  );

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="AI Copilot"
          title="Ask FreBob"
          subtitle={snapshot.totalApproved > 0
            ? `Reading ${snapshot.totalApproved} approved record${snapshot.totalApproved === 1 ? "" : "s"} from Business Memory`
            : "Approve a record in Business Memory to unlock grounded answers"}
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4" /> History
              </Button>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4" /> New chat
              </Button>
            </div>
          }
        />

        <div className="relative rounded-[24px] border border-secondary bg-card overflow-hidden flex flex-col h-[calc(100vh-240px)] min-h-[520px] shadow-card">
          {/* Header strip */}
          <div className="glass-card px-5 py-3 border-b border-secondary/70">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-primary">FreBob AI</p>
                <p className="text-[11px] text-muted-foreground truncate">Grounded on Business Memory · never invents data</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" /> Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-tinted)]/40">
            {messages.length === 0 ? (
              <EmptyChatState />
            ) : (
              messages.map((m) => <ChatBubble key={m.id} msg={m} />)
            )}

            {thinking && <AIThinkingIndicator />}

            {messages.length === 0 && (
              <div className="mt-4 space-y-3">
                <SummaryCard
                  onDaily={() => send("Give me a daily summary of my business.")}
                  onWeekly={() => send("Give me a weekly summary of my business.")}
                  onMonthly={() => send("Give me a monthly summary of my business.")}
                />
                <div>
                  <p className="text-[11px] font-semibold text-primary/60 uppercase tracking-wider mb-2 px-1">
                    Suggested questions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestionCatalog.map((s) => (
                      <SuggestedQuestionCard
                        key={s.key}
                        icon={s.icon}
                        label={s.label}
                        onClick={() => send(s.question)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            onClear={messages.length > 0 ? handleClear : undefined}
            disabled={thinking}
            language={language}
            onLanguageChange={setLanguage}
            languages={COPILOT_LANGUAGES}
          />

          {showHistory && (
            <ConversationHistory
              items={historyItems}
              activeId={activeId}
              onSelect={(id) => { setActiveId(id); setShowHistory(false); }}
              onNew={handleNew}
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>
      </PageCanvas>
    </AppShell>
  );
}
