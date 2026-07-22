// FreBob Batch 13 — Deterministic demo seed for "Amaka Style Hub".
// Produces the exact same records every time so the demo is repeatable,
// presentation-ready and reconciles across dashboard, reports and AI answers.

// We keep the file self-contained (no imports from stores) so it can safely
// build plain JSON that other stores read via listX() helpers.

type UnknownRecord = Record<string, unknown>;

const DEMO_NOW = new Date();
const day = (offsetDays: number, hour = 10, minute = 0) => {
  const d = new Date(DEMO_NOW);
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

// ---- Products -------------------------------------------------------------
const products = [
  { name: "Ankara Fabric — Blue Gold", category: "Ankara", price: 5000, cost: 3200, stock: 24, reorder: 10, unit: "yards" },
  { name: "Ankara Fabric — Burgundy Leaf", category: "Ankara", price: 5500, cost: 3400, stock: 8, reorder: 10, unit: "yards" },
  { name: "Ready-Made Two-Piece Set", category: "Ready-made", price: 18000, cost: 11000, stock: 6, reorder: 4, unit: "units" },
  { name: "Women's Corporate Gown", category: "Ready-made", price: 22000, cost: 13500, stock: 2, reorder: 4, unit: "units" },
  { name: "Men's Senator Outfit", category: "Ready-made", price: 28000, cost: 17000, stock: 9, reorder: 5, unit: "units" },
  { name: "Children's Ankara Dress", category: "Ready-made", price: 7500, cost: 4200, stock: 0, reorder: 6, unit: "units" },
  { name: "Custom Blouse Sewing", category: "Tailoring", price: 8000, cost: 3000, stock: 999, reorder: 0, unit: "orders" },
  { name: "Custom Trouser Sewing", category: "Tailoring", price: 9500, cost: 3500, stock: 999, reorder: 0, unit: "orders" },
  { name: "Full Outfit Alteration", category: "Tailoring", price: 4500, cost: 1500, stock: 999, reorder: 0, unit: "orders" },
  { name: "Beaded Handbag", category: "Accessories", price: 12500, cost: 7500, stock: 14, reorder: 6, unit: "units" },
  { name: "Headwrap", category: "Accessories", price: 3500, cost: 1600, stock: 30, reorder: 12, unit: "units" },
  { name: "Ready-Made Kaftan", category: "Ready-made", price: 16500, cost: 10000, stock: 3, reorder: 5, unit: "units" },
  { name: "Casual Shirt", category: "Ready-made", price: 9000, cost: 5500, stock: 18, reorder: 8, unit: "units" },
  { name: "Event Dress Sewing", category: "Tailoring", price: 25000, cost: 9000, stock: 999, reorder: 0, unit: "orders" },
  { name: "Wedding Guest Outfit", category: "Ready-made", price: 32000, cost: 20000, stock: 5, reorder: 3, unit: "units" },
];

function buildProducts(): UnknownRecord[] {
  return products.map((p, i) => {
    const status = p.stock <= 0 ? "out" : p.stock <= p.reorder ? "low" : "in";
    return {
      id: `demo-up-${i + 1}`,
      sku: `${p.category.slice(0, 3).toUpperCase()}-${(i + 1).toString().padStart(3, "0")}`,
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      reorder: p.reorder,
      unit: p.unit,
      status,
      createdAt: Date.now() - (products.length - i) * 86400000,
      quality: i % 3 === 0 ? "premium" : "standard",
    };
  });
}

// ---- Customers ------------------------------------------------------------
const CUSTOMERS = [
  { id: "demo-cust-1", name: "Adaeze Nwosu", phone: "+2348020000101", email: "adaeze@example.demo", lang: "english", city: "Enugu" },
  { id: "demo-cust-2", name: "Chinedu Okafor", phone: "+2348020000102", email: null, lang: "igbo", city: "Enugu" },
  { id: "demo-cust-3", name: "Amina Bello", phone: "+2348020000103", email: "amina@example.demo", lang: "hausa", city: "Abuja" },
  { id: "demo-cust-4", name: "Temitope Adebayo", phone: "+2348020000104", email: null, lang: "yoruba", city: "Lagos" },
  { id: "demo-cust-5", name: "Ifeoma Eze", phone: "+2348020000105", email: null, lang: "english", city: "Enugu" },
  { id: "demo-cust-6", name: "Yusuf Musa", phone: "+2348020000106", email: null, lang: "hausa", city: "Kano" },
  { id: "demo-cust-7", name: "Blessing Uche", phone: "+2348020000107", email: "blessing@example.demo", lang: "nigerian_pidgin", city: "Onitsha" },
  { id: "demo-cust-8", name: "Sade Adekunle", phone: "+2348020000108", email: null, lang: "yoruba", city: "Ibadan" },
  { id: "demo-cust-9", name: "Ngozi Nnamdi", phone: "+2348020000109", email: null, lang: "igbo", city: "Enugu" },
  { id: "demo-cust-10", name: "Ibrahim Sani", phone: "+2348020000110", email: null, lang: "hausa", city: "Kaduna" },
  // Duplicate candidate for Adaeze
  { id: "demo-cust-11", name: "Adaeze N.", phone: "+2348020000101", email: null, lang: "english", city: "Enugu" },
];

function buildCustomers(): UnknownRecord[] {
  return CUSTOMERS.map((c, i) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    normalizedPhone: c.phone,
    whatsapp: c.phone,
    email: c.email,
    address: null,
    city: c.city,
    state: null,
    preferredLanguage: c.lang,
    notesSummary: null,
    isActive: true,
    createdBy: "Amaka",
    createdAt: day(-30 + i),
    updatedAt: day(-1),
  }));
}

// ---- Orders (via ApprovedRecords) -----------------------------------------
type OrderSeed = {
  ref: string;
  customerId: string;
  daysAgo: number;
  items: { product_name: string; quantity: number; unit_price: number; variant?: string | null }[];
  amount_paid: number;
  order_status: "enquiry" | "reserved" | "pending" | "awaiting_pickup" | "awaiting_delivery" | "completed" | "cancelled";
  delivery?: string | null;
  note?: string | null;
  language?: "english" | "nigerian_pidgin" | "yoruba" | "hausa" | "igbo";
};

const ORDERS: OrderSeed[] = [
  { ref: "FB-100101", customerId: "demo-cust-1", daysAgo: 0, items: [{ product_name: "Ready-Made Two-Piece Set", quantity: 2, unit_price: 18000 }, { product_name: "Headwrap", quantity: 1, unit_price: 3500 }], amount_paid: 20000, order_status: "pending", delivery: "Delivery to New Haven, Enugu", note: "Balance on delivery" },
  { ref: "FB-100102", customerId: "demo-cust-2", daysAgo: 1, items: [{ product_name: "Men's Senator Outfit", quantity: 1, unit_price: 28000 }], amount_paid: 28000, order_status: "completed", delivery: "Walk-in", language: "igbo" },
  { ref: "FB-100103", customerId: "demo-cust-3", daysAgo: 2, items: [{ product_name: "Ankara Fabric — Blue Gold", quantity: 6, unit_price: 5000 }], amount_paid: 15000, order_status: "awaiting_delivery", delivery: "Send to Wuse II, Abuja", language: "hausa" },
  { ref: "FB-100104", customerId: "demo-cust-4", daysAgo: 3, items: [{ product_name: "Event Dress Sewing", quantity: 1, unit_price: 25000 }], amount_paid: 10000, order_status: "reserved", delivery: "Fitting Saturday", language: "yoruba" },
  { ref: "FB-100105", customerId: "demo-cust-5", daysAgo: 4, items: [{ product_name: "Women's Corporate Gown", quantity: 1, unit_price: 22000 }, { product_name: "Full Outfit Alteration", quantity: 1, unit_price: 4500 }], amount_paid: 26500, order_status: "completed", delivery: "Walk-in" },
  { ref: "FB-100106", customerId: "demo-cust-6", daysAgo: 5, items: [{ product_name: "Ready-Made Kaftan", quantity: 2, unit_price: 16500 }], amount_paid: 33000, order_status: "completed", delivery: "Walk-in", language: "hausa" },
  { ref: "FB-100107", customerId: "demo-cust-7", daysAgo: 6, items: [{ product_name: "Beaded Handbag", quantity: 1, unit_price: 12500 }], amount_paid: 0, order_status: "enquiry", delivery: null, language: "nigerian_pidgin", note: "Asked to hold price" },
  { ref: "FB-100108", customerId: "demo-cust-8", daysAgo: 7, items: [{ product_name: "Wedding Guest Outfit", quantity: 1, unit_price: 32000 }], amount_paid: 32000, order_status: "awaiting_pickup", delivery: "Pickup at shop", language: "yoruba" },
  { ref: "FB-100109", customerId: "demo-cust-9", daysAgo: 9, items: [{ product_name: "Children's Ankara Dress", quantity: 3, unit_price: 7500 }], amount_paid: 22500, order_status: "completed", delivery: "Delivery", language: "igbo" },
  { ref: "FB-100110", customerId: "demo-cust-10", daysAgo: 10, items: [{ product_name: "Custom Blouse Sewing", quantity: 2, unit_price: 8000 }], amount_paid: 8000, order_status: "awaiting_pickup", delivery: "Pickup Wednesday" },
  { ref: "FB-100111", customerId: "demo-cust-1", daysAgo: 12, items: [{ product_name: "Casual Shirt", quantity: 2, unit_price: 9000 }], amount_paid: 18000, order_status: "completed", delivery: "Walk-in" },
  { ref: "FB-100112", customerId: "demo-cust-3", daysAgo: 14, items: [{ product_name: "Ankara Fabric — Burgundy Leaf", quantity: 4, unit_price: 5500 }], amount_paid: 22000, order_status: "completed", delivery: "Walk-in", language: "hausa" },
  { ref: "FB-100113", customerId: "demo-cust-5", daysAgo: 16, items: [{ product_name: "Custom Trouser Sewing", quantity: 1, unit_price: 9500 }], amount_paid: 0, order_status: "cancelled", note: "Customer changed mind" },
  { ref: "FB-100114", customerId: "demo-cust-7", daysAgo: 18, items: [{ product_name: "Ready-Made Two-Piece Set", quantity: 1, unit_price: 18000 }], amount_paid: 18000, order_status: "completed", language: "nigerian_pidgin" },
  { ref: "FB-100115", customerId: "demo-cust-2", daysAgo: 21, items: [{ product_name: "Full Outfit Alteration", quantity: 2, unit_price: 4500 }], amount_paid: 9000, order_status: "completed", language: "igbo" },
  { ref: "FB-100116", customerId: "demo-cust-4", daysAgo: 24, items: [{ product_name: "Headwrap", quantity: 4, unit_price: 3500 }], amount_paid: 14000, order_status: "completed", language: "yoruba" },
];

function extractionFor(o: OrderSeed, customerName: string, customerPhone: string) {
  const total = o.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const balance = Math.max(0, total - o.amount_paid);
  const paymentStatus =
    o.amount_paid === 0 ? "unpaid" : balance === 0 ? "paid" : "partially_paid";
  return {
    event_type: "sale_order",
    language: o.language ?? "english",
    customer: { name: customerName, phone: customerPhone },
    items: o.items.map((it) => ({
      product_name: it.product_name,
      variant: it.variant ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    total_amount: total,
    amount_paid: o.amount_paid,
    balance,
    payment_status: paymentStatus,
    order_status: o.order_status,
    delivery_or_pickup: o.delivery ?? null,
    internal_note: o.note ?? null,
    missing_fields: [],
    needs_confirmation: false,
    confidence: "high",
  };
}

function buildOrdersData() {
  const approvedRecords: UnknownRecord[] = [];
  const conversations: UnknownRecord[] = [];
  const orderLinks: { orderId: string; customerId: string }[] = [];
  const payments: UnknownRecord[] = [];

  for (const o of ORDERS) {
    const cust = CUSTOMERS.find((c) => c.id === o.customerId)!;
    const data = extractionFor(o, cust.name, cust.phone);
    const createdAt = day(-o.daysAgo, 10 + (o.daysAgo % 6), (o.daysAgo * 7) % 60);
    const convId = `demo-conv-${o.ref}`;

    conversations.push({
      id: convId,
      createdAt,
      sourceType: "demo",
      language: data.language,
      text: `Demo conversation for ${o.ref} — ${cust.name} — ${o.items.map((it) => `${it.quantity}× ${it.product_name}`).join(", ")}.`,
      status: "approved",
      draft: data,
      edited: data,
      approvedRecordId: `demo-rec-${o.ref}`,
      processingMode: "mock",
    });

    approvedRecords.push({
      id: `demo-rec-${o.ref}`,
      reference: o.ref,
      conversationId: convId,
      approvedAt: createdAt,
      approvedBy: "Amaka",
      data,
      sourceText: `Demo record for ${o.ref}`,
      sourceType: "demo",
    });

    orderLinks.push({ orderId: o.ref, customerId: o.customerId });

    // Additional layered payments (record-embedded amount_paid already counted).
    // Add one follow-up payment for a couple of partial orders to demonstrate multi-payment.
    if (o.ref === "FB-100103") {
      payments.push({
        id: `demo-pay-${o.ref}-2`,
        orderId: o.ref,
        amount: 10000,
        method: "bank_transfer",
        reference: "TRF-4482",
        date: day(-1),
        notes: "Follow-up transfer from customer",
        recordedBy: "Amaka",
        createdAt: day(-1),
      });
    }
    if (o.ref === "FB-100104") {
      payments.push({
        id: `demo-pay-${o.ref}-2`,
        orderId: o.ref,
        amount: 5000,
        method: "cash",
        reference: "",
        date: day(-2),
        notes: "Cash top-up",
        recordedBy: "Amaka",
        createdAt: day(-2),
      });
    }
  }

  return { approvedRecords, conversations, orderLinks, payments };
}

// ---- Business Memory extras (approved standalone records) -----------------
function buildBusinessMemory(): UnknownRecord[] {
  const items = [
    { title: "Delivery preference — Adaeze", body: "Prefers weekday delivery to New Haven, Enugu." },
    { title: "Regular restock — Ankara Blue Gold", body: "Runs out fast; keep 20+ yards in stock." },
    { title: "Wedding season pricing", body: "Wedding Guest Outfit sells 3× more in November–December." },
    { title: "Outstanding balance — Adaeze", body: "Owes ₦21,500 on FB-100101; balance on delivery." },
    { title: "Supplier — Ankara distributor Onitsha", body: "Best price on bulk fabric; Wednesday deliveries." },
    { title: "Payment promise — Blessing", body: "Will confirm order and pay 50% deposit by Friday." },
  ];
  return items.map((r, i) => ({
    id: `demo-mem-${i + 1}`,
    reference: `MEM-${(i + 1).toString().padStart(3, "0")}`,
    conversationId: `demo-mem-conv-${i + 1}`,
    approvedAt: day(-(i + 1) * 2),
    approvedBy: "Amaka",
    sourceText: r.body,
    sourceType: "demo",
    data: {
      event_type: "unknown",
      language: "english",
      customer: { name: null, phone: null },
      items: [],
      total_amount: null,
      amount_paid: null,
      balance: null,
      payment_status: "unknown",
      order_status: "unknown",
      delivery_or_pickup: null,
      internal_note: `${r.title} — ${r.body}`,
      missing_fields: [],
      needs_confirmation: false,
      confidence: "high",
    },
  }));
}

// ---- Extraction-ready conversations (unapproved) --------------------------
function buildDraftConversations(): UnknownRecord[] {
  const drafts = [
    {
      id: "demo-conv-draft-1",
      language: "english",
      text: "Hello, I want the blue and gold Ankara fabric. I need 3 yards. — It is ₦5,000 per yard. Delivery is ₦2,000. — I will transfer ₦10,000 now and balance later.",
    },
    {
      id: "demo-conv-draft-2",
      language: "nigerian_pidgin",
      text: "I need two of that ready-made gown. How much everything? — Na ₦18,000 each. Delivery na ₦2,500. — I go send ₦20,000 first.",
    },
    {
      id: "demo-conv-draft-3",
      language: "yoruba",
      text: "Mo fẹ ra aṣọ igbeyawo (Wedding Guest Outfit). Elo ni? — ₦32,000. — Mo maa san loni.",
    },
  ];
  return drafts.map((d, i) => ({
    id: d.id,
    createdAt: day(-i, 9, i * 12),
    sourceType: "demo",
    language: d.language,
    text: d.text,
    status: "draft",
    processingMode: "mock",
  }));
}

// ---- Inventory events (append-only) ---------------------------------------
function buildInventoryEvents(): UnknownRecord[] {
  const events: UnknownRecord[] = [];
  products.forEach((p, i) => {
    events.push({
      id: `demo-ie-open-${i + 1}`,
      productName: p.name,
      variant: null,
      quantityDelta: p.stock + 10, // opening stock
      unitCost: p.cost,
      eventType: "opening_balance",
      sourceType: "manual",
      sourceId: null,
      note: "Opening stock",
      createdBy: "Amaka",
      createdAt: day(-30, 8, 0),
    });
    if (p.stock < 10 && p.stock > 0) {
      events.push({
        id: `demo-ie-sold-${i + 1}`,
        productName: p.name,
        variant: null,
        quantityDelta: -10,
        eventType: "sold",
        sourceType: "order",
        sourceId: null,
        note: "Sold across recent orders",
        createdBy: "Amaka",
        createdAt: day(-3),
      });
    }
    if (p.stock === 0) {
      events.push({
        id: `demo-ie-out-${i + 1}`,
        productName: p.name,
        variant: null,
        quantityDelta: -10,
        eventType: "sold",
        sourceType: "order",
        sourceId: null,
        note: "Ran out of stock",
        createdBy: "Amaka",
        createdAt: day(-1),
      });
    }
  });
  return events;
}

// ---- Notifications --------------------------------------------------------
function buildNotifications(): UnknownRecord[] {
  const now = day(0);
  return [
    { category: "inventory", priority: "critical", title: "Out of stock — Children's Ankara Dress", description: "Product is fully out of stock. Restock soon.", action: { kind: "view_product", label: "View product", href: "/inventory" }, isRead: false, dedupeKey: "demo-oos-1" },
    { category: "inventory", priority: "high", title: "Low stock — Women's Corporate Gown", description: "Only 2 left. Reorder level is 4.", action: { kind: "view_product", label: "View product", href: "/inventory" }, isRead: false, dedupeKey: "demo-low-1" },
    { category: "inventory", priority: "high", title: "Low stock — Ready-Made Kaftan", description: "Only 3 left. Reorder level is 5.", action: null, isRead: false, dedupeKey: "demo-low-2" },
    { category: "payment", priority: "high", title: "Outstanding balance — Adaeze Nwosu", description: "₦21,500 outstanding on FB-100101.", action: { kind: "record_payment", label: "Record payment", href: "/orders" }, isRead: false, dedupeKey: "demo-bal-1" },
    { category: "payment", priority: "medium", title: "Payment received — Sade Adekunle", description: "₦32,000 received for FB-100108.", action: null, isRead: true, dedupeKey: "demo-pay-1" },
    { category: "order", priority: "medium", title: "Awaiting pickup — Sade Adekunle", description: "Wedding Guest Outfit ready for pickup.", action: { kind: "view_order", label: "View order", href: "/orders" }, isRead: false, dedupeKey: "demo-order-1" },
    { category: "scanner", priority: "medium", title: "Scan ready for review", description: "Transfer confirmation from Amina Bello.", action: { kind: "review_scan", label: "Review scan", href: "/scanner" }, isRead: false, dedupeKey: "demo-scan-1" },
    { category: "customer", priority: "low", title: "Possible duplicate customer", description: "Adaeze Nwosu and Adaeze N. may be the same customer.", action: { kind: "review_duplicates", label: "Review", href: "/customers/duplicates" }, isRead: false, dedupeKey: "demo-dup-1" },
    { category: "report", priority: "info", title: "Weekly report available", description: "You made ₦168,500 this week across 8 orders.", action: { kind: "view_report", label: "Open reports", href: "/reports" }, isRead: true, dedupeKey: "demo-report-1" },
    { category: "ai", priority: "info", title: "Bob has an insight", description: "Adaeze is your top customer this month.", action: { kind: "open_bob", label: "Ask Bob", href: "/ai-assistant" }, isRead: true, dedupeKey: "demo-ai-1" },
  ].map((n, i) => ({
    id: `demo-notif-${i + 1}`,
    businessId: "demo-business",
    userId: "demo-user",
    category: n.category,
    priority: n.priority,
    title: n.title,
    description: n.description,
    relatedModule: n.category,
    relatedRecordId: null,
    actionUrl: n.action?.href ?? "",
    action: n.action,
    dedupeKey: n.dedupeKey,
    isRead: n.isRead,
    createdAt: day(-Math.floor(i / 2), 9, i * 5),
    updatedAt: day(-Math.floor(i / 2), 9, i * 5),
    readAt: n.isRead ? now : null,
  }));
}

// ---- Document scans (pre-computed, tagged as demo) ------------------------
function buildScans(): UnknownRecord[] {
  const scans = [
    {
      documentType: "transfer_confirmation",
      title: "Transfer — Amina Bello ₦15,000",
      customerName: "Amina Bello",
      total: 15000,
      paid: 15000,
    },
    {
      documentType: "pos_receipt",
      title: "POS receipt — ₦28,000",
      customerName: "Chinedu Okafor",
      total: 28000,
      paid: 28000,
    },
    {
      documentType: "sales_receipt",
      title: "Sales receipt — Ready-Made Two-Piece",
      customerName: "Blessing Uche",
      total: 18000,
      paid: 18000,
    },
    {
      documentType: "supplier_invoice",
      title: "Supplier invoice — Ankara distributor",
      customerName: null,
      total: 96000,
      paid: 0,
    },
    {
      documentType: "customer_order",
      title: "Customer order note — Adaeze",
      customerName: "Adaeze Nwosu",
      total: 39500,
      paid: 20000,
    },
  ];
  return scans.map((s, i) => ({
    id: `demo-scan-${i + 1}`,
    createdAt: day(-(i + 1), 11, 30),
    updatedAt: day(-(i + 1), 11, 30),
    title: s.title,
    documentType: s.documentType,
    status: i === 0 ? "ready_for_review" : "approved",
    reviewStatus: i === 0 ? "unreviewed" : "approved",
    source: "demo",
    pages: [],
    fileHash: `demo-hash-${i + 1}`,
    processingMode: "mock",
    processingError: null,
    extraction: {
      documentType: s.documentType,
      businessName: "Amaka Style Hub",
      customerName: s.customerName,
      merchantName: null,
      phone: null,
      documentNumber: null,
      transactionReference: `DEMO-${(i + 1).toString().padStart(4, "0")}`,
      documentDate: day(-(i + 1)).slice(0, 10),
      documentTime: null,
      currency: "₦",
      subtotal: s.total,
      discount: null,
      tax: null,
      deliveryFee: null,
      totalAmount: s.total,
      amountPaid: s.paid,
      outstandingBalance: s.total - s.paid,
      paymentMethod: s.documentType === "transfer_confirmation" ? "bank_transfer" : "cash",
      bankName: null,
      terminalId: null,
      senderName: s.customerName,
      recipientName: "Amaka Style Hub",
      expenseCategory: null,
      deliveryNote: null,
      notes: "Prepared demo scan",
      lineItems: [],
      rawText: `Prepared demo ${s.documentType} — total ₦${s.total.toLocaleString()}.`,
      missingFields: [],
      needsReview: i === 0,
      confidence: "high",
    },
    events: [
      {
        id: `demo-scan-ev-${i + 1}`,
        eventType: "created",
        title: "Demo scan seeded",
        createdAt: day(-(i + 1)),
        createdBy: "Amaka",
      },
    ],
  }));
}

// ---- Assembly -------------------------------------------------------------
export function buildDemoSeed(): Record<string, unknown> {
  const { approvedRecords, conversations, orderLinks, payments } = buildOrdersData();
  const draftConversations = buildDraftConversations();
  const memory = buildBusinessMemory();

  return {
    "frebob.user-products.v1": buildProducts(),
    "frebob.customers.v1": buildCustomers(),
    "frebob.customerNotes.v1": [],
    "frebob.customerEvents.v1": [],
    "frebob.orderCustomerLinks.v1": orderLinks,
    "frebob.orderPayments.v1": payments,
    "frebob.orderStatusOverrides.v1": [],
    "frebob.approvedRecords.v1": [...approvedRecords, ...memory],
    "frebob.conversations.v1": [...conversations, ...draftConversations],
    "frebob.inventoryEvents.v1": buildInventoryEvents(),
    "frebob.notifications.v1": buildNotifications(),
    "frebob.notifications.lastgen.v1": new Date().toISOString(),
    "frebob.documentScans.v1": buildScans(),
    "frebob.customerMergeMeta.v1": [],
    "frebob.customerMergeEvents.v1": [],
    "frebob.customerDuplicateReviews.v1": [],
    "frebob.scanConversions.v1": [],
    "frebob.scanConversionEvents.v1": [],
  };
}
