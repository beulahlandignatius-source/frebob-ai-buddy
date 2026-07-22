// Bob avatar — friendly female AI assistant portrait.
import bobAvatarSrc from "@/assets/bob-avatar.png";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
  xl: "h-14 w-14",
};

export function BobAvatar({
  size = "sm",
  className,
  ring = true,
}: {
  size?: Size;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-secondary shrink-0",
        ring && "ring-1 ring-primary/20 shadow-soft",
        sizeMap[size],
        className,
      )}
      aria-label="Bob avatar"
    >
      <img
        src={bobAvatarSrc}
        alt=""
        width={512}
        height={512}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}
