import { Check, Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, type LanguageCode, isAudioSupported } from "@/i18n/languages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  className?: string;
  compact?: boolean;
  showAudioStatus?: boolean;
};

export function LanguageSelector({ className, compact, showAudioStatus = true }: Props) {
  const { current, change, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  async function pick(code: LanguageCode) {
    setOpen(false);
    if (code === current) return;
    await change(code);
    toast.success(t("language.changeSaved"));
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-secondary bg-card px-3 py-1.5 text-sm hover:border-primary/30 transition",
          compact && "px-2 py-1 text-xs",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 text-primary/70" />
        <span className="font-medium">{active.nativeLabel}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-secondary bg-card shadow-elegant p-1.5"
          >
            {LANGUAGES.map((l) => {
              const selected = l.code === current;
              return (
                <li key={l.code}>
                  <button
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(l.code)}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-secondary/60 transition",
                      selected && "bg-secondary/70",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{l.nativeLabel}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.label}
                        {showAudioStatus ? ` · ${isAudioSupported(l.code) ? t("language.audioAvailable") : t("language.textOnly")}` : ""}
                      </p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
