import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Camera, Upload, FileText, Sparkles, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel } from "@/components/dash";
import { DocumentPreview, ImageQualityWarning, DOCUMENT_TYPES } from "@/components/scanner";
import {
  createScan, validateFile, SCANNER_LIMITS, DEMO_SCAN_DATA_URL,
  type DocumentType, type ScanPage, type QualityStatus,
} from "@/lib/scanner-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const searchSchema = z.object({
  source: z.enum(["camera", "upload", "pdf", "demo"]).optional().default("camera"),
});

export const Route = createFileRoute("/scanner/new")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "New Scan — FreBob" },
      { name: "description", content: "Capture or upload a business document for review." },
      { property: "og:title", content: "New Scan — FreBob" },
      { property: "og:description", content: "Capture, upload and prepare a document for AI extraction." },
    ],
  }),
  component: NewScan,
});

type Step = "capture" | "review" | "type";

function NewScan() {
  const { source } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("capture");
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [docType, setDocType] = useState<DocumentType>("sales_receipt");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const acceptAttr = source === "pdf" ? "application/pdf,image/*" : "image/*";

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    for (const f of arr) {
      if (pages.length >= SCANNER_LIMITS.MAX_PAGES) {
        toast.error(`Maximum ${SCANNER_LIMITS.MAX_PAGES} pages per scan.`);
        break;
      }
      const err = validateFile(f);
      if (err) { toast.error(err); continue; }
      try {
        const dataUrl = await readAsDataURL(f);
        const quality = await analyseQuality(dataUrl, f.type);
        setPages((p) => [
          ...p,
          {
            id: `pg_${Math.random().toString(36).slice(2, 8)}`,
            pageNumber: p.length + 1,
            dataUrl,
            originalDataUrl: dataUrl,
            rotation: 0,
            qualityStatus: quality.status,
            qualityWarnings: quality.warnings,
            fileName: f.name,
            fileType: f.type,
            fileSize: f.size,
          },
        ]);
      } catch {
        toast.error(`FreBob could not upload "${f.name}".`);
      }
    }
  }

  function useDemo() {
    setPages([{
      id: "pg_demo",
      pageNumber: 1,
      dataUrl: DEMO_SCAN_DATA_URL,
      originalDataUrl: DEMO_SCAN_DATA_URL,
      rotation: 0,
      qualityStatus: "ok",
      qualityWarnings: [],
      fileName: "demo-receipt.svg",
      fileType: "image/svg+xml",
      fileSize: DEMO_SCAN_DATA_URL.length,
    }]);
    setDocType("sales_receipt");
    setStep("review");
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    void addFiles(e.dataTransfer.files);
  }

  function rotate(idx: number) {
    setPages((p) => p.map((pg, i) => i === idx ? { ...pg, rotation: ((pg.rotation + 90) % 360) as ScanPage["rotation"] } : pg));
  }
  function remove(idx: number) {
    setPages((p) => p.filter((_, i) => i !== idx).map((pg, i) => ({ ...pg, pageNumber: i + 1 })));
    setActivePage(0);
  }

  async function submit() {
    if (pages.length === 0) return toast.error("Add at least one page first.");
    setBusy(true);
    try {
      const scan = createScan({
        source: source === "pdf" ? "upload" : source === "demo" ? "demo" : source,
        documentType: docType,
        pages,
      });
      navigate({ to: "/scanner/$scanId", params: { scanId: scan.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this scan.");
    } finally {
      setBusy(false);
    }
  }

  const combinedWarnings = useMemo(
    () => Array.from(new Set(pages.flatMap((p) => p.qualityWarnings))),
    [pages],
  );

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Scanner"
          title={
            step === "capture" ? "Capture your document" :
            step === "review" ? "Review pages" :
            "Choose document type"
          }
          subtitle={
            step === "capture" ? "Take a clear photo or upload a file. Original files are always preserved." :
            step === "review" ? "Rotate or replace any page. Add more pages if needed." :
            "Tell FreBob what this document is so extraction works better."
          }
          action={
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/scanner" })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Cancel
            </Button>
          }
        />

        {/* Step: capture */}
        {step === "capture" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionLabel>Capture</SectionLabel>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="rounded-[24px] border-2 border-dashed border-primary/25 bg-[var(--surface-tinted)] p-8 text-center"
              >
                <div className="mx-auto h-14 w-14 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shadow-elegant mb-4">
                  {source === "camera" ? <Camera className="h-6 w-6" /> : source === "pdf" ? <FileText className="h-6 w-6" /> : source === "demo" ? <Sparkles className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                <p className="font-display font-bold">
                  {source === "camera" ? "Take a photo" :
                    source === "pdf" ? "Upload a PDF or image" :
                    source === "demo" ? "Use the demo receipt" : "Drag & drop or browse"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                  Place document on a flat surface. Use good lighting. Keep the whole document inside the frame.
                </p>

                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {source === "camera" && (
                    <Button onClick={() => cameraRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-1" /> Open camera
                    </Button>
                  )}
                  {source !== "demo" && (
                    <Button variant={source === "camera" ? "outline" : "primary"} onClick={() => fileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Choose file{pages.length ? "s" : ""}
                    </Button>
                  )}
                  {source === "demo" && (
                    <Button onClick={useDemo}><Sparkles className="h-4 w-4 mr-1" /> Load demo document</Button>
                  )}
                </div>

                <input ref={fileRef} type="file" multiple accept={acceptAttr} className="hidden"
                  onChange={(e) => addFiles(e.target.files)} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => addFiles(e.target.files)} />
              </div>

              <ul className="mt-4 text-[13px] text-foreground/80 space-y-1.5">
                <li>· Recommended max 10 pages per scan.</li>
                <li>· Images up to 10 MB, PDFs up to 20 MB.</li>
                <li>· FreBob keeps your original file as evidence.</li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <SectionLabel>Added pages ({pages.length})</SectionLabel>
              {pages.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-secondary bg-card p-6 text-center text-sm text-muted-foreground">
                  No pages yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {pages.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-secondary bg-card p-2 pr-3">
                      <img src={p.dataUrl} alt="" style={{ transform: `rotate(${p.rotation}deg)` }} className="h-14 w-12 object-cover rounded-lg border border-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">Page {p.pageNumber}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.fileName ?? "capture.jpg"}</p>
                      </div>
                      <button onClick={() => remove(i)} className="text-xs text-destructive font-semibold hover:underline">Remove</button>
                    </div>
                  ))}
                  <Button className="w-full" onClick={() => setStep("review")} disabled={pages.length === 0}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: review */}
        {step === "review" && pages.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionLabel>Preview</SectionLabel>
              <DocumentPreview
                dataUrl={pages[activePage].dataUrl}
                rotation={pages[activePage].rotation}
                alt={`Page ${activePage + 1}`}
                onRotate={() => rotate(activePage)}
                onReplace={() => fileRef.current?.click()}
                onRemove={() => remove(activePage)}
              />
              <input ref={fileRef} type="file" accept={acceptAttr} className="hidden"
                onChange={(e) => addFiles(e.target.files)} />
              <div className="mt-4">
                <ImageQualityWarning warnings={combinedWarnings} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <SectionLabel>Pages</SectionLabel>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                {pages.map((p, i) => (
                  <button key={p.id} onClick={() => setActivePage(i)}
                    className={cn(
                      "rounded-lg border overflow-hidden bg-card aspect-[3/4]",
                      i === activePage ? "border-primary ring-2 ring-primary/20" : "border-secondary hover:border-primary/25",
                    )}>
                    <img src={p.dataUrl} alt="" style={{ transform: `rotate(${p.rotation}deg)` }} className="h-full w-full object-cover" />
                  </button>
                ))}
                {pages.length < SCANNER_LIMITS.MAX_PAGES && (
                  <button onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-dashed border-primary/30 bg-[var(--surface-tinted)] aspect-[3/4] flex flex-col items-center justify-center text-primary text-xs font-semibold">
                    <Plus className="h-5 w-5 mb-1" /> Add page
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => setStep("type")}>
                  Continue to type <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={() => setStep("capture")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to capture
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: type */}
        {step === "type" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-3">
              <SectionLabel>Document type</SectionLabel>
              {DOCUMENT_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDocType(d.value)}
                  className={cn(
                    "w-full text-left rounded-2xl border p-4 transition",
                    docType === d.value
                      ? "border-primary bg-[var(--surface-tinted)] shadow-card"
                      : "border-secondary bg-card hover:border-primary/25",
                  )}
                >
                  <p className="font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.hint}</p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              <SectionLabel>Summary</SectionLabel>
              <div className="rounded-[20px] border border-secondary bg-card p-4">
                <p className="text-sm"><span className="text-muted-foreground">Pages:</span> <span className="font-semibold">{pages.length}</span></p>
                <p className="text-sm mt-1"><span className="text-muted-foreground">Type:</span> <span className="font-semibold">{DOCUMENT_TYPES.find((d) => d.value === docType)?.label}</span></p>
                <p className="mt-3 text-xs text-muted-foreground">
                  You can change the type later during review if the AI suggests a better match.
                </p>
                <Button className="w-full mt-4" onClick={submit} loading={busy}>
                  Start extraction <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" className="w-full mt-2" onClick={() => setStep("review")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}

function readAsDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read error"));
    r.readAsDataURL(f);
  });
}

// Very lightweight browser-side quality analysis: image size + rough brightness.
async function analyseQuality(dataUrl: string, mime: string): Promise<{ status: QualityStatus; warnings: string[] }> {
  const warnings: string[] = [];
  if (mime === "application/pdf") return { status: "unknown", warnings: ["PDF page previews are not rendered — review carefully."] };
  try {
    const img = await loadImage(dataUrl);
    if (img.width < 600 || img.height < 600) warnings.push("Image is small — text may be hard to read.");
    // Rough brightness sample
    const canvas = document.createElement("canvas");
    const w = Math.min(img.width, 120); const h = Math.min(img.height, 120);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      const avg = sum / (data.length / 4);
      if (avg < 60) warnings.push("The image is dark. Retaking it in better lighting may improve the result.");
      if (avg > 240) warnings.push("The image looks washed out — check for glare.");
    }
  } catch {
    warnings.push("Could not analyse image quality automatically.");
  }
  return { status: warnings.length === 0 ? "ok" : "unknown", warnings };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("load error"));
    img.src = src;
  });
}
