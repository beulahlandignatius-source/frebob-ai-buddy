// Server function for FreBob audio transcription.
// Accepts a base64 WAV blob and returns the plain transcript.
// Uses the Lovable AI gateway (openai/gpt-4o-mini-transcribe).
//
// When `translateToEnglish` is true, we use OpenAI's /audio/translations
// endpoint which transcribes AND translates non-English speech into English
// in one call — so a Yoruba/Hausa/Igbo/Pidgin voice note comes back as
// English text that the rest of the app can process.

import { createServerFn } from "@tanstack/react-start";

type TranscribeInput = {
  audioBase64: string; // raw base64, no data: prefix
  filename?: string;
  language?: string; // ISO-639-1 like "en"; omit for auto-detect
  translateToEnglish?: boolean;
};

type TranscribeResult = {
  ok: boolean;
  text: string;
  translated?: boolean;
  note?: string;
};

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as TranscribeInput;
    if (!d || typeof d.audioBase64 !== "string" || d.audioBase64.length < 100) {
      throw new Error("Audio is required");
    }
    if (d.audioBase64.length > 30_000_000) {
      throw new Error("Audio too large. Please record a shorter clip (under ~20MB).");
    }
    return {
      audioBase64: d.audioBase64,
      filename: d.filename ?? "recording.wav",
      language: d.language,
      translateToEnglish: Boolean(d.translateToEnglish),
    } as TranscribeInput;
  })
  .handler(async ({ data }): Promise<TranscribeResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, text: "", note: "LOVABLE_API_KEY missing" };

    try {
      const bin = Buffer.from(data.audioBase64, "base64");
      const blob = new Blob([bin], { type: "audio/wav" });

      const form = new FormData();
      form.append("model", "openai/gpt-4o-mini-transcribe");
      form.append("file", blob, data.filename);
      // /audio/translations does not accept a `language` field (it always
      // produces English). Only send `language` on the transcription path.
      if (!data.translateToEnglish && data.language) form.append("language", data.language);

      const endpoint = data.translateToEnglish
        ? "https://ai.gateway.lovable.dev/v1/audio/translations"
        : "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });

      if (res.status === 429) return { ok: false, text: "", note: "Rate limited — please try again shortly." };
      if (res.status === 402) return { ok: false, text: "", note: "AI credits exhausted. Please add credits." };
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, text: "", note: `Transcription failed (${res.status}). ${body.slice(0, 200)}` };
      }

      const json = (await res.json()) as { text?: string };
      const text = (json.text ?? "").trim();
      if (!text) return { ok: false, text: "", note: "No speech detected. Please record again." };
      return { ok: true, text, translated: Boolean(data.translateToEnglish) };
    } catch (err) {
      const note = err instanceof Error ? err.message : "Transcription failed";
      return { ok: false, text: "", note };
    }
  });
