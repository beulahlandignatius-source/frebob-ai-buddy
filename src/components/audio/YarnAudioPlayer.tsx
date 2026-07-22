// Reusable audio player for YarnGPT MP3s.
// Play/pause/stop/replay, speed control, aria-live status. No autoplay.

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Props = {
  audioBase64: string;
  format?: string;
  onEnded?: () => void;
  className?: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function YarnAudioPlayer({ audioBase64, format = "mp3", onEnded, className }: Props) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const src = useMemo(() => `data:audio/${format};base64,${audioBase64}`, [audioBase64, format]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed]);

  // Stop on unmount.
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function handlePlay() {
    const el = audioRef.current;
    if (!el) return;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function handlePause() { audioRef.current?.pause(); setPlaying(false); }
  function handleStop() {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPlaying(false);
  }
  function handleReplay() {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().then(() => setPlaying(true)).catch(() => {});
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className={cn("rounded-2xl border border-secondary bg-card p-3 flex items-center gap-3", className)}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        preload="metadata"
      />

      <div className="flex items-center gap-1.5">
        {playing ? (
          <IconBtn label={t("audio.pause")} onClick={handlePause}><Pause className="h-4 w-4" /></IconBtn>
        ) : (
          <IconBtn label={t("audio.play")} onClick={handlePlay} primary><Play className="h-4 w-4" /></IconBtn>
        )}
        <IconBtn label={t("audio.replay")} onClick={handleReplay}><RotateCcw className="h-4 w-4" /></IconBtn>
        <IconBtn label={t("audio.stop")} onClick={handleStop}><Square className="h-4 w-4" /></IconBtn>
      </div>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
          <span>{fmtTime(current)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      <label className="text-[11px] flex items-center gap-1 text-muted-foreground">
        <span className="sr-only">{t("audio.speed")}</span>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-full border border-secondary bg-background px-2 py-1 text-xs"
        >
          {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
        </select>
      </label>

      <span className="sr-only" aria-live="polite">
        {playing ? t("audio.playing") : t("audio.paused")}
      </span>
    </div>
  );
}

function IconBtn({ children, label, onClick, primary }: { children: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center transition",
        primary ? "brand-gradient text-primary-foreground shadow-soft" : "border border-secondary bg-background hover:border-primary/30",
      )}
    >
      {children}
    </button>
  );
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
