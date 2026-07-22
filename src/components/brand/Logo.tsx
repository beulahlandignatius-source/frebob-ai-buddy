import logoAsset from "@/assets/frebob-logo.png.asset.json";

type Props = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
};

export function Logo({ size = 64, className }: Props) {
  return (
    <img
      src={logoAsset.url}
      alt="FreBob"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
