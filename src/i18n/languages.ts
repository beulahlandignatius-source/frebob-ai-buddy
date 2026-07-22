// FreBob — Batch 12A. Language + audio-support metadata.
// This is the single source of truth for the language selector, AI response
// picker, and voice availability. Nigerian Pidgin audio remains disabled
// until validated (validation_required in the spec).

export type LanguageCode = "en" | "pcm" | "yo" | "ha" | "ig";

export type AudioStatus = "available" | "validation_required" | "unavailable";

export type LanguageMeta = {
  code: LanguageCode;
  label: string;         // English label
  nativeLabel: string;   // Speaker-facing native label
  audio: AudioStatus;
  audioLabel: string;    // Short suffix e.g. "Audio available"
};

export const LANGUAGES: LanguageMeta[] = [
  { code: "en",  label: "English",          nativeLabel: "English",         audio: "available",           audioLabel: "Audio available" },
  { code: "pcm", label: "Nigerian Pidgin",  nativeLabel: "Naija Pidgin",    audio: "validation_required", audioLabel: "Text only" },
  { code: "yo",  label: "Yoruba",           nativeLabel: "Yorùbá",          audio: "available",           audioLabel: "Audio available" },
  { code: "ha",  label: "Hausa",            nativeLabel: "Hausa",           audio: "available",           audioLabel: "Audio available" },
  { code: "ig",  label: "Igbo",             nativeLabel: "Igbo",            audio: "available",           audioLabel: "Audio available" },
];

export const AUDIO_LANGUAGES: LanguageCode[] = ["en", "yo", "ha", "ig"];

export function isAudioSupported(code: LanguageCode): boolean {
  return AUDIO_LANGUAGES.includes(code);
}

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
