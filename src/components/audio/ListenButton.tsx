// Listen button — kicks off YarnGPT generation and renders a player inline.
// Never autoplays: audio starts only after the user clicks Play in the player.

import { useState } from "react";
import { Loader2, Volume2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/fb/Button";
import { YarnAudioPlayer } from "./YarnAudioPlayer";
import { generateAudio } from "@/lib/yarngpt.functions";
import type { LanguageCode } from "@/i18n/languages";
import { isAudioSupported } from "@/i18n/languages";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  language: LanguageCode;
  voice?: string;
  sourceType?: string;
  sourceRecordId?: string;
  className?: string;
  size?: "sm" | "default";
};

type State =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; audio: string; format: string }
  | { kind: "unsupported" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string };

export function ListenButton({ text, language, voice, sourceType, sourceRecordId, className, size = "sm" }: Props) {
  const { t } = useTranslation();
  const generate = useServerFn(generateAudio);
  const [state, setState] = useState<State>({ kind: "idle" });

  if (!isAudioSupported(language)) {
    return (
      <p className={cn("text-[11px] text-muted-foreground inline-flex items-center gap-1.5", className)}>
        <AlertCircle className="h-3.5 w-3.5" />
        {language === "pcm" ? t("audio.unsupportedPidgin") : t("audio.unsupportedLanguage")}
      </p>
    );
  }

  async function onListen() {
    if (!text.trim()) return;
    setState({ kind: "generating" });
    try {
      const res = await generate({ data: { text, language, voice, sourceType, sourceRecordId } });
      if (res.status === "ready" && res.audioBase64) {
        setState({ kind: "ready", audio: res.audioBase64, format: res.format ?? "mp3" });
      } else if (res.status === "unsupported_language") {
        setState({ kind: "unsupported" });
      } else if (res.status === "not_configured") {
        setState({ kind: "not_configured" });
      } else if (res.status === "rate_limited") {
        setState({ kind: "error", message: res.message ?? t("errors.generic") });
      } else {
        setState({ kind: "error", message: res.message ?? t("audio.generationFailed") });
      }
    } catch {
      setState({ kind: "error", message: t("audio.networkError") });
    }
  }

  if (state.kind === "ready") {
    return <YarnAudioPlayer audioBase64={state.audio} format={state.format} className={className} />;
  }

  if (state.kind === "not_configured") {
    return <p className={cn("text-[11px] text-muted-foreground", className)}>{t("audio.notConfigured")}</p>;
  }

  if (state.kind === "unsupported") {
    return <p className={cn("text-[11px] text-muted-foreground", className)}>{t("audio.unsupportedLanguage")}</p>;
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={onListen}
        disabled={state.kind === "generating"}
      >
        {state.kind === "generating" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("audio.generating")}</span>
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4" />
            <span>{t("audio.listen")}</span>
          </>
        )}
      </Button>
      {state.kind === "error" && (
        <span className="text-[11px] text-destructive inline-flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" /> {state.message}
        </span>
      )}
    </div>
  );
}
