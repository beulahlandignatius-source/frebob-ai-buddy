export type DemoConversation = {
  id: string;
  title: string;
  language: "english" | "nigerian_pidgin" | "mixed" | "incomplete";
  languageLabel: string;
  summary: string;
  text: string;
};

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "demo-english",
    title: "Full payment — English",
    language: "english",
    languageLabel: "English",
    summary: "Two phones sold, full transfer received.",
    text:
      "Customer: Good afternoon. Do you have Samsung A15 128GB?\n" +
      "Seller: Yes. It is ₦185,000.\n" +
      "Customer: I need two units. I have transferred the full amount.\n" +
      "Seller: Payment confirmed. You can pick them up tomorrow.",
  },
  {
    id: "demo-pidgin",
    title: "Partial payment — Pidgin",
    language: "nigerian_pidgin",
    languageLabel: "Nigerian Pidgin",
    summary: "Reservation with partial deposit, balance to come.",
    text:
      "Customer: Oga, you get Samsung A15 128GB?\n" +
      "Seller: Yes, na ₦185k.\n" +
      "Customer: Keep two for me. I don send ₦200k. I go balance you this evening.",
  },
  {
    id: "demo-mixed",
    title: "Reservation — Mixed",
    language: "mixed",
    languageLabel: "English + Pidgin",
    summary: "Three cartons reserved, unpaid.",
    text:
      "Customer: Please reserve three cartons of Indomie for me.\n" +
      "Seller: One carton is ₦8,500.\n" +
      "Customer: Okay. I never pay yet. I go transfer tomorrow morning.",
  },
  {
    id: "demo-incomplete",
    title: "Needs confirmation",
    language: "incomplete",
    languageLabel: "Unknown",
    summary: "Vague — product and price missing.",
    text: "Customer: Abeg keep three for me.\nSeller: No problem.",
  },
];
