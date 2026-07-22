// FreBob — hidden admin page for YarnGPT setup.
// URL: /admin/yarngpt — not linked from any nav. Reachable only by typing it.
// Shows key configuration status, the voice ↔ language matrix, and lets the
// admin flip `tested` / `enabled` flags per voice.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/nav/AppShell";
import { PageCanvas, SurfaceHeader, StatusBadge } from "@/components/dash";
import { Button } from "@/components/fb/Button";
import { audioKeyStatus, listVoiceStatus, setVoiceStatus, generateAudio } from "@/lib/yarngpt.functions";
import { PREVIEW_TEXT } from "@/lib/yarngpt-config";
import type { LanguageCode } from "@/i18n/languages";
import { YarnAudioPlayer } from "@/components/audio/YarnAudioPlayer";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/yarngpt")({
  head: () => ({
    meta: [
      { title: "YarnGPT Admin — Internal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: YarnGptAdminPage,
});

type Row = { language_code: string; voice_name: string; tested: boolean; enabled: boolean; notes: string | null };

function YarnGptAdminPage() {
  const keyStatus = useServerFn(audioKeyStatus);
  const list = useServerFn(listVoiceStatus);
  const setStatus = useServerFn(setVoiceStatus);
  const generate = useServerFn(generateAudio);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<{ b64: string; format: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [k, r] = await Promise.all([keyStatus(), list()]);
    setConfigured(k.configured);
    setRows(r.rows as Row[]);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(row: Row, field: "tested" | "enabled") {
    await setStatus({ data: { language: row.language_code as LanguageCode, voice: row.voice_name, [field]: !row[field] } });
    await refresh();
  }

  async function testPreview(row: Row) {
    setBusy(`${row.language_code}:${row.voice_name}`);
    setPreview(null);
    try {
      const text = PREVIEW_TEXT[row.language_code as LanguageCode] ?? PREVIEW_TEXT.en;
      const res = await generate({ data: { text, language: row.language_code as LanguageCode, voice: row.voice_name } });
      if (res.status === "ready" && res.audioBase64) {
        setPreview({ b64: res.audioBase64, format: res.format ?? "mp3" });
        toast.success("Preview generated. Play below to validate.");
      } else if (res.status === "not_configured") {
        toast.error("YARNGPT_API_KEY not configured");
      } else {
        toast.error(res.message ?? "Generation failed");
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Internal · unlisted"
          title="YarnGPT Admin"
          subtitle="Validate voice ↔ language combos, then flip `tested` + `enabled` so users can use them."
        />

        <section className="rounded-2xl border border-secondary bg-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">API key</p>
              <p className="font-semibold mt-1">
                {configured === null ? "…" : configured ? "Configured" : "Not configured"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Managed as the <code className="bg-secondary/60 px-1 rounded">YARNGPT_API_KEY</code> secret.
              </p>
            </div>
            <StatusBadge tone={configured ? "success" : "warning"}>
              {configured ? "Live" : "Missing"}
            </StatusBadge>
          </div>
        </section>

        {preview && (
          <section className="mb-4">
            <p className="text-xs font-semibold text-primary/70 mb-2">Preview playback</p>
            <YarnAudioPlayer audioBase64={preview.b64} format={preview.format} />
          </section>
        )}

        <section className="rounded-2xl border border-secondary bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Voice</th>
                <th className="px-4 py-3">Tested</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = `${row.language_code}:${row.voice_name}`;
                return (
                  <tr key={key} className="border-t border-secondary/70">
                    <td className="px-4 py-3 font-medium uppercase">{row.language_code}</td>
                    <td className="px-4 py-3">{row.voice_name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(row, "tested")}
                        className={`px-2.5 py-1 rounded-full text-xs ${row.tested ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-secondary text-muted-foreground"}`}
                      >
                        {row.tested ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(row, "enabled")}
                        className={`px-2.5 py-1 rounded-full text-xs ${row.enabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}
                      >
                        {row.enabled ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" disabled={busy === key || !configured} onClick={() => testPreview(row)}>
                        {busy === key ? "Generating…" : "Test preview"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-4 text-xs text-muted-foreground">
          Nigerian Pidgin (<code>pcm</code>) audio is intentionally omitted — YarnGPT support is not validated. Do not add a Pidgin row until a native speaker approves a tested voice.
        </p>
      </PageCanvas>
    </AppShell>
  );
}
