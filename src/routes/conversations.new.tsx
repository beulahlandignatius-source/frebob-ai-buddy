import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardPaste, Upload, Sparkles, X, FileText, ShieldAlert, Mic, MessageCircle, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader, SectionLabel } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import { DEMO_CONVERSATIONS } from "@/lib/demo-conversations";
import { createConversation, type Language, type SourceType } from "@/lib/records-store";
import { createSourceInput } from "@/lib/source-inputs.functions";
import { getCurrentBusinessSnapshot } from "@/hooks/use-current-business";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { blobToWavBase64 } from "@/lib/audio-wav";
import { VoiceRecorder } from "@/components/audio/VoiceRecorder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

const tabSchema = z.enum(["paste", "voice", "whatsapp", "upload", "demo"]);
const searchSchema = z.object({
  tab: fallback(tabSchema, "paste").default("paste"),
});

export const Route = createFileRoute("/conversations/new")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Import Business Conversation — FreBob" },
      { name: "description", content: "Paste, upload or pick a demo conversation for FreBob to extract into a business record." },
      { property: "og:title", content: "Import Business Conversation — FreBob" },
      { property: "og:description", content: "Conversation Simulation Module for the hackathon MVP." },
    ],
  }),
  component: NewConversation,
});


type Tab = "paste" | "voice" | "whatsapp" | "upload" | "demo";
const LANGS: { value: Language; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "english", label: "English" },
  { value: "nigerian_pidgin", label: "Nigerian Pidgin" },
  { value: "yoruba", label: "Yoruba (team test)" },
  { value: "hausa", label: "Hausa (team test)" },
  { value: "igbo", label: "Igbo (team test)" },
];

const STT_LANG: Partial<Record<Language, string>> = {
  english: "en",
  nigerian_pidgin: "en",
  yoruba: "yo",
  hausa: "ha",
  igbo: "ig",
};

function NewConversation() {
  const navigate = useNavigate();
  const { tab: initialTab } = Route.useSearch();
  const transcribe = useServerFn(transcribeAudio);
  const [tab, setTab] = useState<Tab>(initialTab as Tab);

  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; size: number; text: string } | null>(null);
  const [language, setLanguage] = useState<Language>("auto");
  const [translateVoiceToEnglish, setTranslateVoiceToEnglish] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  // Voice recording state
  const [transcribing, setTranscribing] = useState(false);
  const [audioSource, setAudioSource] = useState<"voice" | "whatsapp_audio" | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    // reset transcript state when switching tabs
  }, []);

  const activeText = tab === "upload"
    ? file?.text ?? ""
    : (tab === "voice" || tab === "whatsapp") ? transcript : text;
  const canProcess = activeText.trim().length > 4 && !busy && !transcribing;

  const handleFile = async (f: File) => {
    const isText = f.type === "text/plain" || f.name.toLowerCase().endsWith(".txt");
    if (!isText) {
      toast.error("This file cannot be processed. Upload a plain .txt file.");
      return;
    }
    if (f.size > 200_000) {
      toast.error("File too large. Please keep under 200KB.");
      return;
    }
    const content = await f.text();
    setFile({ name: f.name, size: f.size, text: content });
  };

  const runTranscription = async (blob: Blob, source: "voice" | "whatsapp_audio", fileName: string) => {
    setTranscribing(true);
    setAudioSource(source);
    setAudioFileName(fileName);
    setTranscript("");
    try {
      const { base64, size } = await blobToWavBase64(blob);
      if (size < 2048) {
        toast.error("That recording was empty — please try again.");
        setTranscribing(false);
        return;
      }
      const langCode = STT_LANG[language];
      const shouldTranslate = translateVoiceToEnglish && langCode !== "en";
      const result = await transcribe({ data: {
        audioBase64: base64,
        filename: fileName.replace(/\.[^.]+$/, ".wav"),
        language: shouldTranslate ? undefined : langCode,
        translateToEnglish: shouldTranslate,
      } });
      if (result.ok) {
        setTranscript(result.text);
        toast.success("Bob transcribed your audio. Review and edit before processing.");
      } else {
        toast.error(result.note || "Transcription failed.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read that audio.";
      toast.error(msg);
    } finally {
      setTranscribing(false);
    }
  };

  const handleVoiceConfirm = async (blob: Blob) => {
    await runTranscription(blob, "voice", `recording-${Date.now()}.webm`);
  };

  const handleAudioUpload = async (f: File) => {
    if (f.size > 20_000_000) {
      toast.error("Audio too large. Please keep under 20MB.");
      return;
    }
    await runTranscription(f, "whatsapp_audio", f.name);
  };

  const start = (sourceType: SourceType, textIn: string, fileName?: string) => {
    setBusy(true);
    const conv = createConversation({ text: textIn.trim(), language, sourceType, fileName });
    navigate({ to: "/conversations/$id", params: { id: conv.id } });
  };

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Add to Business Memory"
          title="Import Business Conversation"
          subtitle="Paste, record a voice summary, upload a WhatsApp voice note, upload a .txt export, or try a demo. Bob will draft a record for you to review."
        />

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-secondary bg-card p-4">
          <ShieldAlert className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Avoid sharing passwords, PINs, card details, BVN or NIN. Bob treats the content as
            data — never as instructions.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-secondary p-1 text-xs font-bold">
          {([
            { v: "paste", l: "Paste text", Icon: ClipboardPaste },
            { v: "voice", l: "Record voice", Icon: Mic },
            { v: "whatsapp", l: "WhatsApp audio", Icon: MessageCircle },
            { v: "upload", l: "Chat .txt", Icon: Upload },
            { v: "demo", l: "Demo", Icon: Sparkles },
          ] as const).map(({ v, l, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 transition",
                tab === v ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {tab === "paste" && (
              <div className="bg-card border border-secondary rounded-[20px] p-4 sm:p-5">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the customer conversation here…"
                  className="w-full min-h-[280px] resize-y rounded-xl border border-secondary bg-background p-3 text-sm leading-relaxed focus-ring focus:border-primary/40"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{text.length.toLocaleString()} characters</span>
                  <button type="button" onClick={() => setText("")} className="text-primary hover:underline">Clear</button>
                </div>
              </div>
            )}

            {tab === "upload" && (
              <div className="bg-card border border-secondary rounded-[20px] p-5">
                {!file ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary py-14 text-center cursor-pointer hover:border-primary/40 transition">
                    <Upload className="h-6 w-6 text-primary" />
                    <p className="font-bold">Upload a .txt chat export</p>
                    <p className="text-xs text-muted-foreground">Plain text only, up to 200KB</p>
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 rounded-2xl border border-secondary p-3">
                      <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => setFile(null)} className="tap-target grid place-items-center rounded-full hover:bg-secondary focus-ring" aria-label="Remove file">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-foreground/80 bg-background rounded-xl border border-secondary p-3 font-sans">{file.text.slice(0, 4000)}{file.text.length > 4000 ? "\n…" : ""}</pre>
                  </div>
                )}
              </div>
            )}

            {tab === "demo" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {DEMO_CONVERSATIONS.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => start("demo", d.text, d.title)}
                    className="text-left bg-card border border-secondary rounded-[20px] p-4 hover:border-primary/30 hover:-translate-y-0.5 transition shadow-card"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-display font-bold text-sm">{d.title}</p>
                      <span className="text-[10px] uppercase tracking-widest text-primary/60">{d.languageLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{d.summary}</p>
                    <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80 font-sans max-h-32 overflow-hidden">{d.text}</pre>
                  </button>
                ))}
              </div>
            )}

            {(tab === "voice" || tab === "whatsapp") && (
              <div className="bg-card border border-secondary rounded-[20px] p-5 space-y-4">
                {tab === "voice" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl brand-gradient text-primary-foreground shadow-elegant flex items-center justify-center shrink-0">
                        <Mic className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm">Record a business summary</p>
                        <p className="text-xs text-muted-foreground">
                          Speak in English, Pidgin, Yoruba, Hausa or Igbo. Pause any time — Bob transcribes when you confirm.
                        </p>
                      </div>
                    </div>
                    <VoiceRecorder
                      onConfirm={handleVoiceConfirm}
                      confirmLabel={transcribing ? "Transcribing…" : "Transcribe with Bob"}
                    />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-secondary py-10 text-center cursor-pointer hover:border-primary/40 transition">
                    <MessageCircle className="h-6 w-6 text-primary" />
                    <p className="font-bold">Upload a WhatsApp voice note</p>
                    <p className="text-xs text-muted-foreground">.ogg, .opus, .m4a, .mp3, .wav — up to 20MB</p>
                    <input
                      type="file"
                      accept="audio/*,.ogg,.opus,.m4a,.mp3,.wav,.webm"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAudioUpload(f);
                      }}
                    />
                  </label>
                )}

                {transcribing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Transcribing audio…
                  </div>
                )}

                {transcript && !transcribing && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary/60">
                        Transcript {audioFileName ? `· ${audioFileName}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setTranscript(""); setAudioSource(null); setAudioFileName(null); }}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Redo
                      </button>
                    </div>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="w-full min-h-[200px] resize-y rounded-xl border border-secondary bg-background p-3 text-sm leading-relaxed focus-ring focus:border-primary/40"
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Edit anything Bob got wrong before processing.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab !== "demo" && (
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => {
                    if (tab === "paste") start("paste", text);
                    else if (tab === "upload" && file) start("upload", file.text, file.name);
                    else if ((tab === "voice" || tab === "whatsapp") && transcript.trim()) {
                      start(audioSource ?? (tab === "voice" ? "voice" : "whatsapp_audio"), transcript, audioFileName ?? undefined);
                    }
                  }}
                  disabled={!canProcess}
                  loading={busy}
                >
                  <Sparkles className="h-4 w-4" /> Process with Bob
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-card border border-secondary rounded-[20px] p-4">
              <SectionLabel>Language</SectionLabel>
              <div className="grid gap-2">
                {LANGS.map((l) => (
                  <label key={l.value} className={cn(
                    "flex items-center justify-between rounded-xl border px-3 h-11 cursor-pointer transition",
                    language === l.value ? "border-primary bg-primary/5" : "border-secondary hover:border-primary/30",
                  )}>
                    <span className="text-sm">{l.label}</span>
                    <input
                      type="radio"
                      name="lang"
                      className="accent-primary"
                      checked={language === l.value}
                      onChange={() => setLanguage(l.value)}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Yoruba, Hausa and Igbo are available for controlled team testing — accuracy is not guaranteed.
              </p>
            </div>
          </aside>
        </div>
      </PageCanvas>
    </AppShell>
  );
}
