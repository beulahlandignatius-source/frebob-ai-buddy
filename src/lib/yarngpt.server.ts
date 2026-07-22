// Server-only YarnGPT helpers.
// Never import this from route/component/functions.ts module scope — load
// inside handlers with `await import(...)`.

import { createHash } from "crypto";

export const YARNGPT_ENDPOINT = "https://yarngpt.ai/api/v1/tts";
export const MAX_CHARS = 2000;

// Privacy scrub — remove or mask patterns we never want to send to the TTS
// provider. Runs before hashing/caching, so cache keys reflect the scrubbed
// text (identical inputs stay identical after redaction).
export function scrubForTTS(input: string): string {
  return input
    // emails
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "«redacted email»")
    // long numeric sequences (phone/account/card) — 8+ digits
    .replace(/\b\d[\d\s-]{7,}\b/g, "«redacted number»")
    // credit-card-like grouped digits
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "«redacted number»")
    .trim();
}

// Split text on sentence boundaries so no chunk exceeds MAX_CHARS.
// Preserves order, never cuts words or numbers.
export function chunkText(text: string, maxChars = MAX_CHARS): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  const sentences = cleaned.match(/[^.!?]+[.!?]*\s*/g) ?? [cleaned];
  let current = "";
  const flush = () => { if (current.trim()) chunks.push(current.trim()); current = ""; };

  for (const s of sentences) {
    if (s.length > maxChars) {
      flush();
      const words = s.match(/\S+/g) ?? [];
      let piece = "";
      for (const w of words) {
        if ((piece + " " + w).trim().length > maxChars) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = w;
        } else {
          piece = (piece + " " + w).trim();
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }
    if ((current + s).length > maxChars) flush();
    current += s;
  }
  flush();
  return chunks;
}

export function hashText(text: string, language: string, voice: string, format: string) {
  return createHash("sha256")
    .update(`${text}|${language}|${voice}|${format}`)
    .digest("hex");
}

// Very small in-memory per-user rate limiter (per worker instance).
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 20;

export function rateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || b.resetAt < now) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

export async function callYarnGPT(text: string, voice: string, format: string, apiKey: string): Promise<string> {
  const res = await fetch(YARNGPT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ text, voice, response_format: format }),
  });

  if (!res.ok) {
    const preview = await res.text().catch(() => "");
    throw new Error(`yarngpt_${res.status}:${preview.slice(0, 120)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  // API may return audio bytes or a JSON envelope with a URL. Handle both.
  if (contentType.includes("application/json")) {
    const json = await res.json() as { audio?: string; url?: string; audio_url?: string };
    if (json.audio) return json.audio; // assumed base64
    const url = json.url ?? json.audio_url;
    if (!url) throw new Error("yarngpt_no_audio_in_response");
    const audioRes = await fetch(url);
    if (!audioRes.ok) throw new Error(`yarngpt_fetch_${audioRes.status}`);
    const buf = new Uint8Array(await audioRes.arrayBuffer());
    return bufToBase64(buf);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  return bufToBase64(buf);
}

function bufToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  // btoa is available in the Worker runtime.
  return btoa(binary);
}
