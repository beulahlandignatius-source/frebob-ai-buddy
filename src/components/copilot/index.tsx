// FreBob Copilot — reusable chat components (Calm Ledger identity).

import type { ReactNode } from "react";
import { Sparkles, ShieldCheck, Send, Mic, Trash2, Clock, MessageSquare, Plus, X, FileText, TrendingUp, Wallet, AlertTriangle, Package, ClipboardList, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/fb/Button";
import type { EvidenceItem, CopilotLanguage } from "@/lib/copilot-context";

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  evidence?: EvidenceItem[];
  mode?: "ai" | "mock";
  isError?: boolean;
};

/* ---------- UserMessage ---------- */
export function UserMessage({ msg }: { msg: CopilotMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-[20px] rounded-br-md px-4 py-2.5 brand-gradient text-primary-foreground shadow-elegant">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <p className="text-[10px] mt-1 text-white/70 text-right">{msg.time}</p>
      </div>
    </div>
  );
}

/* ---------- AIMessage ---------- */
export function AIMessage({ msg }: { msg: CopilotMessage }) {
  return (
    <div className="flex flex-col items-start gap-2 max-w-[92%]">
      <div className={cn(
        "rounded-[20px] rounded-bl-md px-4 py-3 border shadow-card",
        msg.isError ? "border-destructive/30 bg-destructive/5" : "border-secondary bg-card",
      )}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-6 w-6 rounded-lg brand-gradient text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="text-[11px] font-semibold text-primary">FreBob</span>
          {msg.mode === "mock" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Offline mode</span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">{msg.time}</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{msg.text}</p>
      </div>
      {msg.evidence && msg.evidence.length > 0 && <EvidenceCard items={msg.evidence} />}
    </div>
  );
}

/* ---------- ChatBubble — role router ---------- */
export function ChatBubble({ msg }: { msg: CopilotMessage }) {
  return msg.role === "user" ? <UserMessage msg={msg} /> : <AIMessage msg={msg} />;
}

/* ---------- EvidenceCard ---------- */
export function EvidenceCard({ items }: { items: EvidenceItem[] }) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2 border border-primary/15 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        <ShieldCheck className="h-3 w-3" /> Evidence
      </div>
      {items.map((it, i) => (
        <span key={i} className="text-[11px] text-muted-foreground">
          <span className="text-primary/70">{it.label}:</span>{" "}
          <span className="font-medium text-foreground">{it.value}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- AIThinkingIndicator ---------- */
export function AIThinkingIndicator({ label = "FreBob is analysing your business…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
      <div className="h-6 w-6 rounded-lg brand-gradient text-primary-foreground flex items-center justify-center">
        <Sparkles className="h-3 w-3" />
      </div>
      <span>{label}</span>
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "240ms" }} />
      </span>
    </div>
  );
}

/* ---------- SuggestedQuestionCard ---------- */
export const suggestionCatalog = [
  { key: "today", icon: TrendingUp, label: "Today's Sales", question: "How much did I sell today?" },
  { key: "owe", icon: Wallet, label: "Outstanding Payments", question: "Who still owes me?" },
  { key: "low", icon: AlertTriangle, label: "Low Stock", question: "What products are running low?" },
  { key: "pending", icon: ClipboardList, label: "Pending Orders", question: "Show today's pending orders." },
  { key: "summary", icon: PieChart, label: "Daily Summary", question: "Give me a daily summary of my business." },
  { key: "best", icon: Package, label: "Best Selling Products", question: "Which products sold the most?" },
];

export function SuggestedQuestionCard({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-secondary bg-card p-3 hover:border-primary/30 hover:shadow-card transition flex items-start gap-2 min-h-[64px]"
    >
      <div className="h-8 w-8 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0 group-hover:brand-gradient group-hover:text-primary-foreground transition">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
    </button>
  );
}

/* ---------- EmptyChatState ---------- */
export function EmptyChatState({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      <div className="h-14 w-14 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shadow-elegant mb-3">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="font-display font-bold text-lg text-primary">Ask FreBob anything about your business.</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        I answer using records you've already approved in Business Memory — never guesses.
      </p>
      {children}
    </div>
  );
}

/* ---------- ChatInput ---------- */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onVoice,
  onClear,
  disabled,
  language,
  onLanguageChange,
  languages,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onVoice?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  language: CopilotLanguage;
  onLanguageChange: (v: CopilotLanguage) => void;
  languages: { value: CopilotLanguage; label: string }[];
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="border-t border-secondary/70 bg-card p-3 space-y-2"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
          }}
          rows={1}
          placeholder="Ask about sales, stock, customers, orders…"
          className="flex-1 resize-none min-h-[44px] max-h-40 px-4 py-2.5 rounded-2xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="button"
          onClick={onVoice}
          title="Voice input (coming soon)"
          className="h-11 w-11 rounded-2xl border border-secondary bg-background text-muted-foreground hover:text-primary hover:border-primary/30 transition flex items-center justify-center shrink-0"
        >
          <Mic className="h-4 w-4" />
        </button>
        <Button type="submit" size="sm" disabled={disabled || !value.trim()} className="h-11 w-11 rounded-2xl p-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Language</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as CopilotLanguage)}
            className="rounded-lg border border-secondary bg-background text-[11px] px-2 py-1 focus:outline-none focus:border-primary/40"
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </label>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition"
          >
            <Trash2 className="h-3 w-3" /> Clear conversation
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------- ConversationHistory ---------- */
export type ConversationSummary = { id: string; title: string; updatedAt: string; count: number };

export function ConversationHistory({
  items,
  activeId,
  onSelect,
  onNew,
  onClose,
}: {
  items: ConversationSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 bg-card flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <p className="font-display font-bold text-sm text-primary">Chat History</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-primary p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">
        <Button size="sm" variant="outline" onClick={onNew} className="w-full">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No past chats yet.</p>
        )}
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "w-full text-left rounded-xl px-3 py-2 border transition",
              c.id === activeId
                ? "border-primary/30 bg-secondary/50"
                : "border-transparent hover:bg-secondary/40",
            )}
          >
            <p className="text-sm font-medium truncate text-foreground">{c.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {c.updatedAt} · {c.count} message{c.count === 1 ? "" : "s"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- SummaryCard ---------- */
export function SummaryCard({
  onDaily, onWeekly, onMonthly,
}: {
  onDaily: () => void;
  onWeekly: () => void;
  onMonthly: () => void;
}) {
  const opts = [
    { label: "Daily", icon: PieChart, onClick: onDaily },
    { label: "Weekly", icon: TrendingUp, onClick: onWeekly },
    { label: "Monthly", icon: FileText, onClick: onMonthly },
  ];
  return (
    <div className="rounded-2xl border border-primary/15 glass-card p-3">
      <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-wider mb-2">Get a summary</p>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.label}
            onClick={o.onClick}
            className="rounded-xl bg-card border border-secondary hover:border-primary/30 hover:shadow-card transition p-2 flex flex-col items-center gap-1"
          >
            <o.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
