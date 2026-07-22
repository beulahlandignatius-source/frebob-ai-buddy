// User-added inventory products — localStorage prototype store.
// Extends the mock Product shape with an optional image (data URL),
// quality tier and free-form notes so users can capture richer detail.

import type { Product } from "@/lib/mock-data";

const KEY = "frebob.user-products.v1";

export type Quality = "standard" | "premium" | "budget" | "second-hand";

export type UserProduct = Product & {
  image?: string; // data URL
  quality?: Quality;
  notes?: string;
  createdAt: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }

function read(): UserProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProduct[]) : [];
  } catch {
    return [];
  }
}
function write(list: UserProduct[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  emit();
}

export function listUserProducts(): UserProduct[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeUserProducts(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export type AddProductInput = {
  name: string;
  category: string;
  price: number;
  cost?: number;
  stock: number;
  reorder?: number;
  unit: string;
  image?: string;
  quality?: Quality;
  notes?: string;
  sku?: string;
};

function statusFor(stock: number, reorder: number): Product["status"] {
  if (stock <= 0) return "out";
  if (stock <= reorder) return "low";
  return "in";
}

export function addUserProduct(input: AddProductInput): UserProduct {
  const reorder = input.reorder ?? Math.max(1, Math.floor(input.stock * 0.2));
  const id = `up-${Date.now().toString(36)}`;
  const sku = input.sku?.trim() ||
    `${input.category.slice(0, 3).toUpperCase()}-${id.slice(-4).toUpperCase()}`;
  const product: UserProduct = {
    id,
    sku,
    name: input.name.trim(),
    category: input.category.trim(),
    price: input.price,
    cost: input.cost ?? Math.round(input.price * 0.7),
    stock: input.stock,
    reorder,
    unit: input.unit.trim() || "units",
    status: statusFor(input.stock, reorder),
    image: input.image,
    quality: input.quality,
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
  };
  const list = read();
  list.push(product);
  write(list);
  return product;
}

export function removeUserProduct(id: string) {
  write(read().filter((p) => p.id !== id));
}

// Read a File as compressed data URL (max ~800px, jpeg).
export async function fileToImageDataUrl(file: File, maxSize = 800): Promise<string> {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || "image/jpeg" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
