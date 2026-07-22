// Reusable premium voice recorder — waveform, timer, pause/resume, cancel/confirm.
// Emits the recorded Blob via onConfirm once the user reviews playback.
//
// Used on the Add Business Record → Voice tab and inside Bob chat.

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, X, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/fb/Button";
import { startMicRecorder, type MicRecorder } from "@/lib/audio-wav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "idle" | "recording" | "paused" | "review";

export function VoiceRecorder({
  onConfirm,
  onCancel,
  autoStart = false,
  compact = false,
  maxSeconds = 300,
  confirmLabel = "Use recording",
}: {
  onConfirm: (blob: Blob) => void | Promise<void>;
  onCancel?: () => void;
  autoStart?: boolean;
  compact?: boolean;
  maxSeconds?: number;
  confirmLabel?: string;
}) {
  const recorderRef = useRef<MicRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const teardownAudio = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    stopTimer();
    teardownAudio();
    recorderRef.current?.cancel();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachAnalyser = (stream: MediaStream) => {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    draw();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);
    const render = () => {
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 32;
      const step = Math.floor(bufferLen / bars);
      const barW = (w / bars) * 0.65;
      const gap = (w / bars) * 0.35;
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        const avg = sum / step;
        const bh = Math.max(3, (avg / 255) * h * 0.9);
        const x = i * (barW + gap) + gap / 2;
        const y = (h - bh) / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + bh);
        grad.addColorStop(0, "hsl(var(--primary))");
        grad.addColorStop(1, "hsl(var(--accent))");
        ctx.fillStyle = grad;
        ctx.beginPath();
        const r = Math.min(barW / 2, 3);
        ctx.roundRect(x, y, barW, bh, r);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const start = async () => {
    if (starting || status === "recording" || status === "paused") return;
    setStarting(true);
    try {
      const rec = await startMicRecorder();
      recorderRef.current = rec;
      setStatus("recording");
      setElapsed(0);
      setBlob(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= maxSeconds) { void stop(); }
          return next;
        });
      }, 1000);
      attachAnalyser(rec.stream);
    } catch {
      toast.error("Microphone access is needed to record.");
    } finally {
      setStarting(false);
    }
  };

  const pause = () => {
    recorderRef.current?.pause();
    stopTimer();
    setStatus("paused");
  };

  const resume = () => {
    recorderRef.current?.resume();
    setStatus("recording");
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stop = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    stopTimer();
    teardownAudio();
    const b = await rec.stop();
    recorderRef.current = null;
    setBlob(b);
    setPreviewUrl(URL.createObjectURL(b));
    setStatus("review");
  };

  const cancel = () => {
    stopTimer();
    teardownAudio();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setBlob(null);
    setElapsed(0);
    setStatus("idle");
    onCancel?.();
  };

  const redo = () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setBlob(null);
    setElapsed(0);
    setStatus("idle");
    void start();
  };

  const confirm = async () => {
    if (!blob) return;
    setBusy(true);
    try { await onConfirm(blob); }
    finally { setBusy(false); }
  };

  // Auto-start once on mount if requested.
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoRef.current) {
      autoRef.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const active = status === "recording" || status === "paused";
  const progressPct = Math.min(100, (elapsed / maxSeconds) * 100);

  return (
    <div className={cn("space-y-3", compact ? "" : "rounded-2xl border-2 border-dashed border-secondary p-5")}>
      {/* Waveform / static bars */}
      <div className="relative rounded-2xl bg-secondary/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={640}
          height={72}
          className="w-full h-16 block"
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Tap the mic to start recording
          </div>
        )}
        {status === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-accent pointer-events-none">
            Paused
          </div>
        )}
        {active && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        )}
      </div>

      {/* Timer + status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {status === "recording" && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Recording
            </span>
          )}
          {status === "paused" && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">Paused</span>
          )}
          {status === "review" && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary">Ready to send</span>
          )}
        </div>
        <span className="tabular-nums font-semibold text-foreground">{mm}:{ss} <span className="text-muted-foreground font-normal">/ {Math.floor(maxSeconds/60)}:{String(maxSeconds%60).padStart(2,"0")}</span></span>
      </div>

      {/* Playback preview */}
      {status === "review" && previewUrl && (
        <audio ref={playerRef} src={previewUrl} controls className="w-full h-10" />
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {status === "idle" && (
          <Button size="sm" onClick={start} disabled={starting}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {starting ? "Starting…" : "Start recording"}
          </Button>
        )}

        {status === "recording" && (
          <>
            <Button size="sm" variant="outline" onClick={pause}>
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button size="sm" onClick={stop}>
              <Square className="h-4 w-4" /> Stop
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} className="text-muted-foreground">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </>
        )}

        {status === "paused" && (
          <>
            <Button size="sm" onClick={resume}>
              <Play className="h-4 w-4" /> Resume
            </Button>
            <Button size="sm" variant="outline" onClick={stop}>
              <Square className="h-4 w-4" /> Stop
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} className="text-muted-foreground">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </>
        )}

        {status === "review" && (
          <>
            <Button size="sm" variant="outline" onClick={redo} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Re-record
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy} className="text-muted-foreground">
              <X className="h-4 w-4" /> Discard
            </Button>
            <Button size="sm" onClick={confirm} loading={busy}>
              <Check className="h-4 w-4" /> {confirmLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
