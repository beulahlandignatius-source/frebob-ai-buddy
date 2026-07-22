import { Sparkles } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  const { active } = useDemo();
  if (!active) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" /> Demo
    </span>
  );
}
