// Per-order notes and attachments — localStorage prototype store.

export type OrderNote = {
  id: string;
  orderId: string;
  text: string;
  author: string;
  createdAt: string;
};

export type OrderAttachment = {
  id: string;
  orderId: string;
  name: string;
  mime: string;
  dataUrl: string; // base64 data URL
  size: number;
  createdAt: string;
};

const NOTES_KEY = "frebob.orderNotes.v1";
const ATTACH_KEY = "frebob.orderAttachments.v1";

function isBrowser() { return typeof window !== "undefined"; }
function read<T>(k: string): T[] {
  if (!isBrowser()) return [];
  try { const raw = window.localStorage.getItem(k); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
function write<T>(k: string, rows: T[]) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(k, JSON.stringify(rows)); } catch { /* quota */ }
}
function nid(p: string) { return `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`; }

export function listOrderNotes(orderId: string): OrderNote[] {
  return read<OrderNote>(NOTES_KEY).filter((n) => n.orderId === orderId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export function addOrderNote(orderId: string, text: string, author = "You"): OrderNote {
  const row: OrderNote = { id: nid("nt"), orderId, text: text.trim(), author, createdAt: new Date().toISOString() };
  const rows = read<OrderNote>(NOTES_KEY);
  rows.push(row);
  write(NOTES_KEY, rows);
  return row;
}
export function deleteOrderNote(id: string) {
  write(NOTES_KEY, read<OrderNote>(NOTES_KEY).filter((n) => n.id !== id));
}

export function listOrderAttachments(orderId: string): OrderAttachment[] {
  return read<OrderAttachment>(ATTACH_KEY).filter((a) => a.orderId === orderId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export function addOrderAttachment(input: { orderId: string; name: string; mime: string; dataUrl: string; size: number }): OrderAttachment {
  const row: OrderAttachment = { id: nid("att"), createdAt: new Date().toISOString(), ...input };
  const rows = read<OrderAttachment>(ATTACH_KEY);
  rows.push(row);
  write(ATTACH_KEY, rows);
  return row;
}
export function deleteOrderAttachment(id: string) {
  write(ATTACH_KEY, read<OrderAttachment>(ATTACH_KEY).filter((a) => a.id !== id));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
