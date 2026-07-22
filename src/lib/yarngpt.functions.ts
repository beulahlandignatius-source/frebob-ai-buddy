// FreBob — Batch 12A. YarnGPT server functions.
// Called by the client `ListenButton` + hidden admin page. All secrets and
// provider calls stay server-side.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LangCode = "en" | "pcm" | "yo" | "ha" | "ig";

type GenerateInput = {
  text: string;
  language: LangCode;
  voice?: string;
  sourceType?: string;
  sourceRecordId?: string;
};

type GenerateResult = {
  status: "ready" | "unsupported_language" | "not_configured" | "rate_limited" | "failed";
  audioBase64?: string;
  format?: string;
  voice?: string;
  language?: LangCode;
  parts?: number;
  cached?: boolean;
  message?: string;
};

const AUDIO_LANGS = new Set<LangCode>(["en", "yo", "ha", "ig"]);

export const generateAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown): GenerateInput => {
    const d = (raw ?? {}) as Partial<GenerateInput>;
    if (typeof d.text !== "string" || d.text.trim().length === 0) throw new Error("text is required");
    if (d.text.length > 20000) throw new Error("text too long (max 20000 chars)");
    const lang = (d.language ?? "en") as LangCode;
    return {
      text: d.text,
      language: lang,
      voice: typeof d.voice === "string" ? d.voice : undefined,
      sourceType: typeof d.sourceType === "string" ? d.sourceType : undefined,
      sourceRecordId: typeof d.sourceRecordId === "string" ? d.sourceRecordId : undefined,
    };
  })
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const apiKey = process.env.YARNGPT_API_KEY;
    if (!apiKey) {
      return { status: "not_configured", message: "YARNGPT_API_KEY missing" };
    }

    if (!AUDIO_LANGS.has(data.language)) {
      return { status: "unsupported_language", language: data.language };
    }

    const server = await import("./yarngpt.server");
    const { scrubForTTS, chunkText, hashText, callYarnGPT, rateLimit } = server;

    const gate = rateLimit(context.userId);
    if (!gate.ok) {
      return { status: "rate_limited", message: `Try again in ${gate.retryAfter ?? 30}s` };
    }

    // Pick a voice: caller-supplied → first enabled voice for this language.
    let voice = data.voice;
    if (!voice) {
      const { data: rows } = await context.supabase
        .from("yarngpt_voice_status")
        .select("voice_name")
        .eq("language_code", data.language)
        .eq("enabled", true)
        .limit(1);
      voice = rows?.[0]?.voice_name;
    }
    if (!voice) return { status: "failed", message: "No voice enabled for this language." };

    // Verify voice is allowed server-side.
    const { data: allowed } = await context.supabase
      .from("yarngpt_voice_status")
      .select("enabled")
      .eq("language_code", data.language)
      .eq("voice_name", voice)
      .maybeSingle();
    if (!allowed?.enabled) return { status: "failed", message: "Voice not enabled." };

    const format = "mp3";
    const cleanText = scrubForTTS(data.text);
    if (!cleanText) return { status: "failed", message: "Empty text after redaction." };

    const chunks = chunkText(cleanText);
    const combinedHash = hashText(cleanText, data.language, voice, format);

    // Cache lookup (combined text)
    const { data: cached } = await context.supabase
      .from("audio_cache")
      .select("audio_base64")
      .eq("user_id", context.userId)
      .eq("text_hash", combinedHash)
      .eq("language_code", data.language)
      .eq("voice_name", voice)
      .eq("response_format", format)
      .maybeSingle();

    if (cached?.audio_base64) {
      return {
        status: "ready",
        audioBase64: cached.audio_base64,
        format,
        voice,
        language: data.language,
        parts: chunks.length,
        cached: true,
      };
    }

    try {
      // Generate each chunk sequentially, concatenate the base64 outputs.
      // For MVP: concatenate mp3 payloads (browser MP3 decoders tolerate
      // concatenation for simple files). Long-text playback quality is a
      // known MVP limitation.
      const audios: string[] = [];
      for (const c of chunks) {
        const b64 = await callYarnGPT(c, voice, format, apiKey);
        audios.push(b64);
      }

      const combined = audios.length === 1 ? audios[0] : concatBase64Mp3(audios);

      // Cache
      try {
        await context.supabase.from("audio_cache").insert({
          user_id: context.userId,
          text_hash: combinedHash,
          language_code: data.language,
          voice_name: voice,
          response_format: format,
          audio_base64: combined,
          source_type: data.sourceType,
          source_record_id: data.sourceRecordId,
        });
      } catch { /* non-fatal */ }

      return {
        status: "ready",
        audioBase64: combined,
        format,
        voice,
        language: data.language,
        parts: chunks.length,
        cached: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "yarngpt_error";
      // Never leak provider text/keys — log a short tag only.
      // eslint-disable-next-line no-console
      console.error("[yarngpt] generation failed:", msg.slice(0, 80));
      return { status: "failed", message: "Audio generation failed. Please try again." };
    }
  });

function concatBase64Mp3(list: string[]): string {
  const bufs = list.map((b64) => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  });
  const total = bufs.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) { out.set(b, off); off += b.length; }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < out.length; i += chunkSize) {
    binary += String.fromCharCode(...out.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ---------- Admin: list + toggle voice status ----------

export const listVoiceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("yarngpt_voice_status")
      .select("language_code, voice_name, tested, enabled, updated_at, notes")
      .order("language_code");
    return { rows: data ?? [] };
  });

export const setVoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { language: LangCode; voice: string; tested?: boolean; enabled?: boolean; notes?: string };
    if (!d?.language || !d?.voice) throw new Error("language and voice required");
    return d;
  })
  .handler(async ({ data, context }) => {
    // Admin-only in the sense of "unlisted page" — RLS uses service_role for
    // writes. We use supabaseAdmin here because yarngpt_voice_status writes
    // aren't user-scoped and we don't want to widen the anon/authenticated
    // grant.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("yarngpt_voice_status")
      .update({
        tested: data.tested ?? undefined,
        enabled: data.enabled ?? undefined,
        notes: data.notes ?? undefined,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("language_code", data.language)
      .eq("voice_name", data.voice);
    return { ok: true };
  });

export const audioKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { configured: Boolean(process.env.YARNGPT_API_KEY) };
  });
