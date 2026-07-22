export type TourStep = {
  id: string;
  title: string;
  description: string;
  target?: string;   // data-tour attribute value
  route?: string;    // optional route to navigate to before showing step
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to FreBob",
    description:
      "FreBob turns everyday business conversations, receipts and records into useful business information.",
    route: "/dashboard",
    placement: "center",
  },
  {
    id: "dashboard",
    title: "Your business command centre",
    description:
      "Track today's sales, money received, outstanding balances and low-stock alerts at a glance.",
    target: "dashboard-metrics",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    id: "add-record",
    title: "Add a business record",
    description:
      "Paste a conversation, upload a WhatsApp export, or run a demo conversation to see how FreBob captures activity.",
    target: "nav-add",
    placement: "top",
  },
  {
    id: "extraction",
    title: "AI extraction",
    description:
      "FreBob identifies customer, product, payment and order details from every record — always for your review.",
    route: "/business-memory",
    placement: "center",
  },
  {
    id: "review",
    title: "You review every field",
    description:
      "Nothing is saved automatically. You can edit and approve extracted information before it becomes a record.",
    placement: "center",
  },
  {
    id: "memory",
    title: "Business Memory",
    description:
      "Approved records become searchable knowledge Bob can reason about later.",
    target: "nav-memory",
    route: "/business-memory",
    placement: "top",
  },
  {
    id: "inventory",
    title: "Inventory",
    description:
      "Track available, reserved, low and out-of-stock products across your business.",
    target: "nav-inventory",
    route: "/inventory",
    placement: "top",
  },
  {
    id: "orders",
    title: "Orders & payments",
    description:
      "See who has paid, who still owes you, and record new payments against any order.",
    route: "/orders",
    placement: "center",
  },
  {
    id: "customers",
    title: "Customers",
    description:
      "Every customer's activity, spending and outstanding balance in one profile.",
    route: "/customers",
    placement: "center",
  },
  {
    id: "scanner",
    title: "Scanner",
    description:
      "Turn receipts, invoices and transfer confirmations into reviewed records.",
    route: "/scanner",
    placement: "center",
  },
  {
    id: "reports",
    title: "Reports",
    description:
      "See sales, payments, orders and stock trends over 30 days.",
    route: "/reports",
    placement: "center",
  },
  {
    id: "bob",
    title: "Ask Bob",
    description:
      "Ask questions about your business. Every answer shows the approved records it used.",
    target: "nav-bob",
    route: "/ai-assistant",
    placement: "top",
  },
  {
    id: "finish",
    title: "You're ready to explore",
    description:
      "Try a demo conversation, ask Bob a question, or scan a demo document to see FreBob end-to-end.",
    route: "/dashboard",
    placement: "center",
  },
];
