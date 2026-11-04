import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type PanelVariant = "default" | "glass" | "parchment" | "gold";

const PANEL_CLASS: Record<PanelVariant, string> = {
  default: "",
  glass: "pixel-box-glass",
  parchment: "pixel-box-parchment",
  gold: "pixel-box-gold",
};

export function Panel({
  variant = "glass",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: PanelVariant }) {
  return <div className={`pixel-box ${PANEL_CLASS[variant]} ${className}`} {...props} />;
}

type ButtonVariant = "gold" | "myth" | "fact" | "blue" | "stone" | "ghost";

export function PixelButton({
  variant = "gold",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    sm: "!px-3 !py-2 !text-[0.65rem]",
    md: "",
    lg: "!px-8 !py-5 !text-base md:!text-lg",
    xl: "!px-10 !py-7 !text-xl md:!text-2xl",
  }[size];
  const variantClass = variant === "gold" ? "" : `pixel-btn-${variant}`;
  return <button type="button" className={`pixel-btn ${variantClass} ${sizeClass} ${className}`} {...props} />;
}

export function PixelHeading({
  children,
  className = "",
  as: Heading = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  return <Heading className={`font-pixel uppercase leading-snug pixel-text-shadow ${className}`}>{children}</Heading>;
}

export function Tag({ children, color = "gold", className = "" }: { children: ReactNode; color?: "gold" | "ruby" | "grass" | "sky" | "stone"; className?: string }) {
  const colors = {
    gold: "bg-gold text-ink",
    ruby: "bg-ruby text-snow",
    grass: "bg-grass text-ink",
    sky: "bg-sky text-ink",
    stone: "bg-stone text-snow",
  }[color];
  return (
    <span
      className={`inline-block px-2 py-1 font-pixel text-[0.6rem] uppercase tracking-wider shadow-[0_-2px_0_0_#0d0e17,0_2px_0_0_#0d0e17,-2px_0_0_0_#0d0e17,2px_0_0_0_#0d0e17] md:text-xs ${colors} ${className}`}
    >
      {children}
    </span>
  );
}

export function LiveDot({ live }: { live: "connecting" | "live" | "offline" }) {
  const label = live === "live" ? "LIVE" : live === "connecting" ? "LINKING" : "SYNCING";
  const color = live === "live" ? "bg-lime" : live === "connecting" ? "bg-gold" : "bg-ember";
  return (
    <span className="inline-flex items-center gap-2 font-pixel text-[0.6rem] text-snow/80" title={live === "offline" ? "Realtime unavailable - using periodic sync" : "Realtime connected"}>
      <span className={`inline-block h-2.5 w-2.5 ${color} ${live === "live" ? "" : "animate-blink"}`} />
      {label}
    </span>
  );
}
