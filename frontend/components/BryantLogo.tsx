/**
 * Bryant University logo renderer.
 *
 * Reads assets from `public/brand/`. Each variant maps to a specific file —
 * see `public/brand/README.md` for what goes in each slot and the expected
 * aspect ratios.
 *
 * `height` controls rendered size; the SVG viewBox handles the aspect ratio,
 * so you never need to set `width` unless you want to clip/override.
 */

export type BryantLogoVariant =
  | "primary"
  | "primary-reverse"
  | "wordmark"
  | "seal";

const ASSETS: Record<
  BryantLogoVariant,
  { src: string; alt: string; defaultHeight: number }
> = {
  primary: {
    src: "/brand/bryant-primary-horizontal.svg",
    alt: "Bryant University",
    defaultHeight: 32,
  },
  "primary-reverse": {
    src: "/brand/bryant-primary-horizontal-reverse.svg",
    alt: "Bryant University",
    defaultHeight: 32,
  },
  wordmark: {
    src: "/brand/bryant-wordmark.svg",
    alt: "Bryant University",
    defaultHeight: 24,
  },
  seal: {
    src: "/brand/bryant-seal.svg",
    alt: "Bryant University seal",
    defaultHeight: 32,
  },
};

interface BryantLogoProps {
  variant?: BryantLogoVariant;
  height?: number;
  className?: string;
  /** Override the computed alt — useful when the logo is purely decorative
   *  and sits next to visible Bryant text. Pass "" to mark decorative. */
  alt?: string;
}

export function BryantLogo({
  variant = "primary",
  height,
  className = "",
  alt,
}: BryantLogoProps) {
  const asset = ASSETS[variant];
  const resolvedAlt = alt ?? asset.alt;
  return (
    <img
      src={asset.src}
      alt={resolvedAlt}
      height={height ?? asset.defaultHeight}
      /* Let the browser infer width from the SVG's intrinsic ratio. */
      style={{ height: height ?? asset.defaultHeight, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}
