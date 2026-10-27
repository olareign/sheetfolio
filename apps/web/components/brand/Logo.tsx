import Image from "next/image";

// Both files are 720x153; the display size follows from the height asked for.
const RATIO = 720 / 153;

/**
 * The Dosinex wordmark. The dark-lettered file reads on light surfaces and the light-lettered one on dark ones. On
 * the themed screens both are rendered (eagerly, so a theme switch never shows a gap) and the page's theme shows one
 * of them (see `.brand-logo-*` in sp.css). `onDark` is for surfaces that are always dark, like the marketing footer,
 * where only the light-lettered file is needed.
 */
export function Logo({ height = 28, onDark = false }: { height?: number; onDark?: boolean }) {
  const width = Math.round(height * RATIO);
  if (onDark) {
    return (
      <Image src="/brand/dosinex-logo-light.png" alt="Dosinex" width={width} height={height} className="brand-logo" />
    );
  }
  return (
    <>
      <Image
        src="/brand/dosinex-logo.png"
        alt="Dosinex"
        width={width}
        height={height}
        loading="eager"
        className="brand-logo brand-logo-onlight"
      />
      <Image
        src="/brand/dosinex-logo-light.png"
        alt="Dosinex"
        width={width}
        height={height}
        loading="eager"
        className="brand-logo brand-logo-ondark"
      />
    </>
  );
}
