export const APP_VERSION = "v0.19.0 — Batch 19A";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pcm", label: "Nigerian Pidgin" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
] as const;

export const BUSINESS_CATEGORIES = [
  "Retail / Shop",
  "Fashion & Tailoring",
  "Food & Restaurant",
  "Beauty & Salon",
  "Electronics",
  "Provision Store",
  "Pharmacy",
  "Services",
  "Wholesale",
  "Other",
] as const;

export const CURRENCIES = [
  { code: "NGN", label: "₦ Naira (NGN)" },
  { code: "USD", label: "$ US Dollar (USD)" },
  { code: "GHS", label: "₵ Ghanaian Cedi (GHS)" },
  { code: "KES", label: "KSh Kenyan Shilling (KES)" },
] as const;
