// Client-safe YarnGPT configuration.
// The server owns the actual voice ↔ language allowlist; this file only
// carries display metadata used by the voice selector and admin page.

import type { LanguageCode } from "@/i18n/languages";

export type YarnVoiceMeta = {
  voice: string;
  displayName: string;
  language: LanguageCode;
  description: string;
};

// Superset of voices we may surface; enablement lives server-side in
// yarngpt_voice_status (tested + enabled flags).
export const YARN_VOICE_CATALOG: YarnVoiceMeta[] = [
  { voice: "Idera",    displayName: "Idera",    language: "en", description: "Warm, professional English narration." },
  { voice: "Emma",     displayName: "Emma",     language: "en", description: "Clear neutral English." },
  { voice: "Zainab",   displayName: "Zainab",   language: "en", description: "Confident Nigerian English." },
  { voice: "Wura",     displayName: "Wura",     language: "yo", description: "Yorùbá voice, natural pacing." },
  { voice: "Femi",     displayName: "Femi",     language: "yo", description: "Yorùbá, business-friendly tone." },
  { voice: "Zainab",   displayName: "Zainab (Hausa)",   language: "ha", description: "Hausa narration." },
  { voice: "Umar",     displayName: "Umar",     language: "ha", description: "Hausa, warm." },
  { voice: "Chinenye", displayName: "Chinenye", language: "ig", description: "Igbo narration." },
  { voice: "Adaora",   displayName: "Adaora",   language: "ig", description: "Igbo, clear." },
];

export const PREVIEW_TEXT: Record<LanguageCode, string> = {
  en:  "Welcome to FreBob. Let us understand your business today.",
  pcm: "Welcome to FreBob. Make we look your business today.",
  yo:  "Ẹ káàbọ̀ sí FreBob. Jẹ́ ká ṣe àyẹ̀wò iṣẹ́ rẹ lónìí.",
  ha:  "Barka da zuwa FreBob. Bari mu duba kasuwancin ka a yau.",
  ig:  "Nnọọ na FreBob. Ka anyị leba anya n'azụmahịa gị taa.",
};

export const MAX_TTS_CHARS = 2000;
