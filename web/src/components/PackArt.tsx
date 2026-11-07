import { useState } from "react";

/** Bump when scripts/render-pack-images.ts output changes, so phones fetch the new images. */
const PACK_IMAGE_VERSION = 1;

/**
 * Product image. With a SKU code it shows the rendered pack shot (/products/<code>.webp, about
 * 2.4 kB, lazy-loaded so only rows on screen download). Without one, or if the image fails,
 * it falls back to the inline SVG drawing, so a row is never left with a broken image.
 */
const BRAND_COLORS: Record<string, { fill: string; tint: string }> = {
  "Rewa Foods": { fill: "#c2552b", tint: "#fbeee7" },
  "Satpura Tea": { fill: "#6b4a2b", tint: "#f4eee7" },
  "Shuddh Home Care": { fill: "#2f5fb3", tint: "#eaf0fa" },
  "Madhuban Kitchen": { fill: "#b07a12", tint: "#f9f2e2" },
};

export function PackArt({ kind, brand, label, size = 96, code, alt = "" }: { kind: string; brand: string; label: string; size?: number; code?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (code && !failed) {
    return (
      <img
        src={`/products/${code.toLowerCase()}.webp?v=${PACK_IMAGE_VERSION}`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        alt={alt}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-xl bg-[#f5f4f1] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const c = BRAND_COLORS[brand] ?? { fill: "#5e6661", tint: "#eff0ec" };
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} role="img" aria-hidden="true" className="shrink-0 rounded-xl" style={{ background: c.tint }}>
      {shape(kind, c.fill)}
      <text x="48" y="88" textAnchor="middle" fontSize="10" fontWeight="700" fill={c.fill} fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </svg>
  );
}

function shape(kind: string, fill: string) {
  switch (kind) {
    case "biscuit":
      return (
        <g>
          <rect x="20" y="22" width="56" height="44" rx="6" fill={fill} />
          <circle cx="38" cy="44" r="9" fill="#f3d9a4" />
          <circle cx="58" cy="44" r="9" fill="#f3d9a4" />
          <circle cx="38" cy="44" r="1.5" fill="#c79a52" />
          <circle cx="58" cy="44" r="1.5" fill="#c79a52" />
        </g>
      );
    case "tea":
      return (
        <g>
          <path d="M30 22h36l4 46H26z" fill={fill} />
          <path d="M40 40c0-6 16-6 16 0v6c0 6-16 6-16 0z" fill="#e9dcc8" />
          <path d="M44 34c2-3 6-3 8 0" stroke="#e9dcc8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "box":
      return (
        <g>
          <rect x="24" y="18" width="48" height="52" rx="4" fill={fill} />
          <circle cx="48" cy="42" r="12" fill="#ffffff" opacity=".9" />
          <circle cx="48" cy="42" r="6" fill={fill} opacity=".5" />
        </g>
      );
    case "bar":
      return (
        <g>
          <rect x="18" y="32" width="60" height="30" rx="12" fill={fill} />
          <rect x="30" y="41" width="36" height="12" rx="6" fill="#ffffff" opacity=".85" />
        </g>
      );
    case "bottle":
      return (
        <g>
          <rect x="42" y="14" width="12" height="10" rx="2" fill={fill} opacity=".7" />
          <path d="M36 28c0-3 3-5 6-5h12c3 0 6 2 6 5v38c0 3-2 4-4 4H40c-2 0-4-1-4-4z" fill={fill} />
          <rect x="40" y="38" width="16" height="18" rx="3" fill="#ffffff" opacity=".85" />
        </g>
      );
    case "noodles":
      return (
        <g>
          <rect x="20" y="22" width="56" height="44" rx="6" fill={fill} />
          <path d="M30 40c4-4 8 4 12 0s8 4 12 0 8 4 12 0M30 48c4-4 8 4 12 0s8 4 12 0 8 4 12 0" stroke="#f6e3a8" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "pouch":
    default:
      return (
        <g>
          <path d="M28 20h40l-2 6 4 40c0 3-2 4-4 4H30c-2 0-4-1-4-4l4-40z" fill={fill} />
          <rect x="36" y="36" width="24" height="18" rx="4" fill="#ffffff" opacity=".85" />
        </g>
      );
  }
}
