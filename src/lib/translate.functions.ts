// FreBob — Google AI Studio (Gemini) powered translation.
// Server-only. Never exposes the API key.
// Used by:
//   1) The i18n runtime fallback (translates missing UI strings on the fly)
//   2) The "Translate this page" toggle in Settings
//   3) Voice input -> English translation flow (text side)
//
// Falls back to LOVABLE_API_KEY (Gemini via Lovable AI Gateway) when
// GOOGLE_AI_STUDIO_API_KEY is not configured.

import { createServerFn } from "@tanstack/react-start";

type LangCode = "en" | "pcm" | "yo" | "ha" | "ig";

const LANG_NAMES: Record<LangCode, string> = {
  en: "English",
  pcm: "Nigerian Pidgin",
  yo: "Yoruba",
  ha: "Hausa",
  ig: "Igbo",
};

type TranslateInput = {
  texts: string[];
  targetLanguage: LangCode | string;
  sourceLanguage?: LangCode | string; // "auto" if omitted
};

type TranslateResult = {
  ok: boolean;
  translations: string[]; // same length/order as input; falls back to source on failure
  note?: string;
};

// Simple in-memory batch limits per request.
const MAX_ITEMS = 200;
const MAX_TOTAL_CHARS = 20_000;

export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): TranslateInput => {
    const d = (raw ?? {}) as Partial<TranslateInput>;
    if (!Array.isArray(d.texts)) throw new Error("texts must be an array");
    const texts = d.texts.filter((t): t is string => typeof t === "string");
    if (texts.length === 0) throw new Error("texts is empty");
    if (texts.length > MAX_ITEMS) throw new Error(`too many texts (max ${MAX_ITEMS})`);
    const total = texts.reduce((n, t) => n + t.length, 0);
    if (total > MAX_TOTAL_CHARS) throw new Error(`payload too large (max ${MAX_TOTAL_CHARS} chars)`);
    if (typeof d.targetLanguage !== "string" || !d.targetLanguage.trim()) {
      throw new Error("targetLanguage is required");
    }
    return {
      texts,
      targetLanguage: d.targetLanguage,
      sourceLanguage: typeof d.sourceLanguage === "string" ? d.sourceLanguage : "auto",
    };
  })
  .handler(async ({ data }): Promise<TranslateResult> => {
    const target = data.targetLanguage as LangCode;
    // No-op when target is English source language equal — but callers can still use for STT.
    const targetName = LANG_NAMES[target] ?? data.targetLanguage;
    const sourceName = data.sourceLanguage && data.sourceLanguage !== "auto"
      ? (LANG_NAMES[data.sourceLanguage as LangCode] ?? data.sourceLanguage)
      : "auto-detected language";

    const googleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!googleKey && !lovableKey) {
      return { ok: false, translations: data.texts, note: "No translation key configured." };
    }

    const prompt = buildPrompt(data.texts, sourceName, targetName);

    try {
      const raw = googleKey
        ? await callGoogleGemini(prompt, googleKey)
        : await callLovableGemini(prompt, lovableKey!);

      const parsed = parseJsonArray(raw, data.texts.length);
      if (!parsed) {
        return { ok: false, translations: data.texts, note: "Translator returned an unreadable response." };
      }
      return { ok: true, translations: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "translation_failed";
      // eslint-disable-next-line no-console
      console.error("[translate] failed:", msg.slice(0, 120));
      return { ok: false, translations: data.texts, note: "Translation failed." };
    }
  });

function buildPrompt(texts: string[], sourceName: string, targetName: string): string {
  return [
    `You are a professional translator for a business SME app used across Nigeria.`,
    `Translate each item from ${sourceName} to ${targetName}.`,
    `Rules:`,
    `- Preserve numbers, currency symbols (₦, $), placeholders like {{name}}, {count}, %s and %d exactly.`,
    `- Keep punctuation and capitalisation natural for the target language.`,
    `- If a term has no natural translation (e.g. brand or proper noun), keep it in English.`,
    `- For Nigerian Pidgin (pcm) use everyday Naija Pidgin, not English.`,
    `- Return ONLY a JSON array of strings, same length and order as the input. No commentary.`,
    ``,
    `Input:`,
    JSON.stringify(texts),
  ].join("\n");
}

async function callGoogleGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`google_${res.status}`);
  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callLovableGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`lovable_${res.status}`);
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJsonArray(text: string, expectedLen: number): string[] | null {
  if (!text) return null;
  // Trim code fences if any
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      // Pad/truncate to expected length so callers can safely map.
      if (parsed.length === expectedLen) return parsed;
      if (parsed.length > expectedLen) return parsed.slice(0, expectedLen);
      return [...parsed, ...Array(expectedLen - parsed.length).fill("")];
    }
    // Some models may wrap it: { translations: [...] }
    if (parsed && Array.isArray((parsed as { translations?: unknown }).translations)) {
      const arr = (parsed as { translations: unknown[] }).translations.filter(
        (x): x is string => typeof x === "string",
      );
      if (arr.length === expectedLen) return arr;
    }
    return null;
  } catch {
    return null;
  }
}
