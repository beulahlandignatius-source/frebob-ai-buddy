// Canned Bob answers for demo mode when the live AI is unavailable.
export const DEMO_FALLBACK_ANSWERS: { match: RegExp; answer: string }[] = [
  { match: /sell.*today|today.*sale/i, answer: "You sold about ₦59,500 today across 1 pending order — 2 Ready-Made Two-Piece Sets and 1 Headwrap for Adaeze Nwosu." },
  { match: /received.*week|money.*week|earn.*week/i, answer: "You received ₦168,500 this week across 8 orders. Bank transfers made up ₦55,000 of that." },
  { match: /owe|outstanding|balance/i, answer: "Three customers still owe you: Adaeze Nwosu (₦21,500 on FB-100101), Amina Bello (₦5,000 on FB-100103) and Temitope Adebayo (₦10,000 on FB-100104). Total outstanding: ₦36,500." },
  { match: /sold most|best.*sell|top.*product/i, answer: "Ready-Made Two-Piece Set is your best seller this month — 3 units sold for ₦54,000." },
  { match: /low|running low|restock/i, answer: "Three products need attention: Ankara Fabric — Burgundy Leaf (8 yards, reorder at 10), Women's Corporate Gown (2 units, reorder at 4) and Children's Ankara Dress (0 — out of stock)." },
  { match: /pending order/i, answer: "You have 4 open orders: 1 pending (Adaeze), 1 awaiting delivery (Amina), 2 awaiting pickup (Sade, Ibrahim)." },
  { match: /top customer|best customer/i, answer: "Adaeze Nwosu is your top customer this month with ₦57,500 spent across 2 orders." },
  { match: /summar/i, answer: "This month you completed 8 orders worth ₦168,500, with ₦36,500 still outstanding. Ready-Made Two-Piece Set is your best seller and 3 products are running low." },
];

export function findDemoAnswer(question: string): string | null {
  const q = question.trim();
  for (const row of DEMO_FALLBACK_ANSWERS) {
    if (row.match.test(q)) return row.answer;
  }
  return null;
}
