/**
 * Renders a pack shot for every SKU in the catalogue → web/public/products/<code>.webp
 *
 * The brands are fictional, so there are no real product photos to use (and copying real pack
 * photos would be someone else's copyright). Instead each image is drawn from the catalogue
 * data: packaging shape by product type, colour by product, brand, English and Hindi name, and
 * pack size. Re-run after catalogue changes:  npx tsx scripts/render-pack-images.ts
 *
 * Needs Google Chrome (headless screenshot); sharp (dev dependency) makes the WebP. Output: 192 px WebP, a few kB each.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { PRODUCTS, type SeedProduct } from "../prisma/data/catalogue";

const OUT = path.resolve("web/public/products");
const SIZE = 400;
const THUMB = 192;
const CHROME = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(
  (p) => p && existsSync(p),
);

type Palette = { c: string; d: string; l: string };
/** Main colour, dark accent, light accent per SKU: what the product looks like on a shelf. */
const COLORS: Record<string, Palette> = {
  "SKU-BS-075": { c: "#E8A33D", d: "#6E3510", l: "#F6D9A0" },
  "SKU-BS-200": { c: "#DE952C", d: "#6E3510", l: "#F6D9A0" },
  "SKU-BS-400": { c: "#D3861D", d: "#6E3510", l: "#F6D9A0" },
  "SKU-MB-075": { c: "#3E7CC9", d: "#0F2F5A", l: "#F4E6C2" },
  "SKU-CB-100": { c: "#5A2E1B", d: "#2A1209", l: "#D9B48A" },
  "SKU-CB-050": { c: "#6B3520", d: "#2A1209", l: "#D9B48A" },
  "SKU-EB-100": { c: "#4E8A3E", d: "#1D3A12", l: "#EADFB8" },
  "SKU-NK-200": { c: "#D6452F", d: "#5E150B", l: "#F2B24A" },
  "SKU-NK-400": { c: "#C33A25", d: "#5E150B", l: "#F2B24A" },
  "SKU-NK-MIX": { c: "#8C2F7A", d: "#3A0F33", l: "#F0B44C" },
  "SKU-ND-070": { c: "#F2C230", d: "#B8261B", l: "#FBE7A1" },
  "SKU-ND-280": { c: "#EAB71E", d: "#B8261B", l: "#FBE7A1" },
  "SKU-TE-250": { c: "#8E1D24", d: "#3B0B0E", l: "#E7C27A" },
  "SKU-TE-500": { c: "#7E1A20", d: "#3B0B0E", l: "#E7C27A" },
  "SKU-TE-1KG": { c: "#6E161C", d: "#3B0B0E", l: "#E7C27A" },
  "SKU-TD-1KG": { c: "#2E4A2A", d: "#122010", l: "#C9B27A" },
  "SKU-SL-1KG": { c: "#1F6FB5", d: "#0C2E52", l: "#FFFFFF" },
  "SKU-SL-RCK": { c: "#C77D86", d: "#5A2A31", l: "#F7E1E4" },
  "SKU-HL-100": { c: "#F2B705", d: "#6B4A00", l: "#FFE27A" },
  "SKU-HL-200": { c: "#E5A800", d: "#6B4A00", l: "#FFE27A" },
  "SKU-MC-100": { c: "#C4161C", d: "#540609", l: "#F06A4A" },
  "SKU-DH-100": { c: "#4F8C2A", d: "#1E3A0E", l: "#B8D67A" },
  "SKU-KT-500": { c: "#C8102E", d: "#5A0614", l: "#FFFFFF" },
  "SKU-KT-1KG": { c: "#B50E28", d: "#5A0614", l: "#FFFFFF" },
  "SKU-PH-500": { c: "#D9822B", d: "#5A2A00", l: "#F4E3BF" },
  "SKU-DT-1KG": { c: "#1F5FBF", d: "#0B2552", l: "#F2C230" },
  "SKU-DT-500": { c: "#2A6CCB", d: "#0B2552", l: "#F2C230" },
  "SKU-DT-2KG": { c: "#174FA3", d: "#0B2552", l: "#F2C230" },
  "SKU-DT-LQ1": { c: "#6A3FB5", d: "#2B1352", l: "#E7DBFA" },
  "SKU-DB-150": { c: "#2E8BC0", d: "#0E3A55", l: "#E3F2FA" },
  "SKU-DB-250": { c: "#2378AD", d: "#0E3A55", l: "#E3F2FA" },
  "SKU-DW-200": { c: "#4CAF50", d: "#1B4D1D", l: "#E5F5D3" },
  "SKU-DW-500": { c: "#3E9B43", d: "#1B4D1D", l: "#E5F5D3" },
  "SKU-DL-250": { c: "#6DBE45", d: "#25501A", l: "#F1F8E8" },
  "SKU-DL-500": { c: "#5AAE36", d: "#25501A", l: "#F1F8E8" },
  "SKU-FC-1L": { c: "#7B4FB8", d: "#2F1652", l: "#EFE6FA" },
  "SKU-FC-500": { c: "#8A5FC4", d: "#2F1652", l: "#EFE6FA" },
  "SKU-TC-500": { c: "#1E5AA8", d: "#0A2448", l: "#DCEBFA" },
  "SKU-SP-100": { c: "#2E7D32", d: "#123814", l: "#DDEFD7" },
  "SKU-SP-150": { c: "#276E2B", d: "#123814", l: "#DDEFD7" },
  "SKU-SP-LIM": { c: "#A3C93A", d: "#3E5A0A", l: "#F4F9D9" },
  "SKU-HW-200": { c: "#E05A8A", d: "#5C1430", l: "#FBE3EC" },
  "SKU-HW-750": { c: "#D94C7E", d: "#5C1430", l: "#FBE3EC" },
};

const BRAND_MARK: Record<string, string> = { "Rewa Foods": "REWA", "Satpura Tea": "SATPURA", "Shuddh Home Care": "SHUDDH", "Madhuban Kitchen": "MADHUBAN" };

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** Split a name into at most two balanced lines. */
function lines(name: string, max = 13): string[] {
  if (name.length <= max) return [name];
  const words = name.split(" ");
  let best: [string, string] = [name, ""];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { best = [a, b]; bestDiff = diff; }
  }
  return best.filter(Boolean);
}

const FONT = `font-family="'Helvetica Neue', Helvetica, Arial, 'Kohinoor Devanagari', sans-serif"`;

function label(p: SeedProduct, col: Palette, x: number, y: number, opts: { color?: string; size?: number; width?: number } = {}) {
  const size = opts.size ?? 30;
  const color = opts.color ?? "#FFFFFF";
  const name = lines(p.name, opts.width ?? 13);
  const brand = BRAND_MARK[p.brand] ?? p.brand.toUpperCase();
  return `
  <g ${FONT} text-anchor="middle" fill="${color}">
    <text x="${x}" y="${y}" font-size="15" font-weight="700" letter-spacing="3" opacity=".85">${esc(brand)}</text>
    ${name.map((l, i) => `<text x="${x}" y="${y + 34 + i * (size + 4)}" font-size="${size}" font-weight="700">${esc(l)}</text>`).join("")}
    <text x="${x}" y="${y + 34 + name.length * (size + 4) + 4}" font-size="16" opacity=".9">${esc(p.nameHi)}</text>
  </g>`;
}

function badge(p: SeedProduct, col: Palette, cx: number, cy: number, r = 34) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"/><circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${col.c}" stroke-width="2"/>
  <text x="${cx}" y="${cy + 7}" ${FONT} text-anchor="middle" font-size="${p.packLabel.length > 5 ? 17 : 20}" font-weight="700" fill="${col.d}">${esc(p.packLabel)}</text>`;
}

const ground = (w = 260) => `<ellipse cx="200" cy="352" rx="${w / 2}" ry="12" fill="#000" opacity=".07"/>`;

/** Flow-wrap pack with crimped ends: biscuits and noodles. */
function flowWrap(p: SeedProduct, col: Palette) {
  const crimp = (x: number, dir: 1 | -1) => {
    let d = `M${x} 105`;
    for (let y = 105; y < 315; y += 14) d += ` L${x + dir * 12} ${y + 7} L${x} ${y + 14}`;
    return `<path d="${d} Z" fill="${col.d}" opacity=".9"/>`;
  };
  const isNoodle = p.art === "noodles";
  const isCream = /cream/i.test(p.name);
  const goods = isNoodle
    ? [0, 1, 2].map((i) => `<path d="M96 ${258 + i * 14} q 20 -14 40 0 t 40 0 t 40 0 t 40 0" fill="none" stroke="${col.l}" stroke-width="7" stroke-linecap="round"/>`).join("")
    : isCream
      ? [0, 1].map((i) => `<g transform="translate(${130 + i * 96} 278)"><ellipse rx="40" ry="16" fill="${col.d}"/><ellipse cy="-9" rx="40" ry="7" fill="${col.l}"/><ellipse cy="-16" rx="40" ry="14" fill="${col.d}"/></g>`).join("")
      : [0, 1, 2].map((i) => `<g transform="translate(${116 + i * 66} 276)"><circle r="30" fill="${col.l}"/><circle r="30" fill="none" stroke="${col.d}" stroke-opacity=".25" stroke-width="3"/>${[[-10, -8], [10, -8], [0, 6], [-12, 10], [12, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${col.d}" opacity=".45"/>`).join("")}</g>`).join("");
  return `${ground(300)}
  <rect x="56" y="105" width="288" height="210" rx="16" fill="${col.c}"/>
  <rect x="56" y="105" width="288" height="56" rx="16" fill="#FFFFFF" opacity=".12"/>
  ${crimp(56, -1)}${crimp(344, 1)}
  ${label(p, col, 200, 136, { size: 26, width: 18 })}
  ${goods}
  ${badge(p, col, 306, 274, 30)}`;
}

/** Carton with a visible side: detergent powder and tea. */
function carton(p: SeedProduct, col: Palette) {
  const isTea = p.art === "tea";
  const icon = isTea
    ? `<g transform="translate(180 278)"><path d="M-34 0 h68 l-8 38 h-52 z" fill="#FFFFFF"/><path d="M34 8 q18 0 14 16 q-4 12 -18 8" fill="none" stroke="#FFFFFF" stroke-width="5"/><path d="M-6 -10 q-10 -24 10 -38 q14 20 -10 38" fill="${col.l}"/></g>`
    : `<g transform="translate(180 282)"><circle r="40" fill="#FFFFFF"/><path d="M-26 6 q12 -26 32 -14 q18 12 -2 26 q-14 10 -24 -4" fill="none" stroke="${col.c}" stroke-width="7" stroke-linecap="round"/><circle r="40" fill="none" stroke="${col.l}" stroke-width="5"/></g>`;
  return `${ground(240)}
  <path d="M276 62 l34 -22 v272 l-34 26 z" fill="${col.d}"/>
  <path d="M84 62 l34 -22 h192 l-34 22 z" fill="${col.c}" opacity=".75"/>
  <rect x="84" y="62" width="192" height="276" rx="4" fill="${col.c}"/>
  <rect x="84" y="62" width="192" height="64" fill="${col.d}" opacity=".35"/>
  ${label(p, col, 180, 96, { size: 26, width: 12 })}
  ${icon}
  ${badge(p, col, 244, 324, 26)}`;
}

/** Stand-up pouch with a window: namkeen, salt, spices, poha, refill. */
function pouch(p: SeedProduct, col: Palette) {
  const powder = /haldi|chilli|dhania|salt|poha|bhujia|mixture/i.test(p.name);
  const contents = /salt/i.test(p.name)
    ? Array.from({ length: 18 }, (_, i) => `<rect x="${150 + (i % 6) * 16}" y="${262 + Math.floor(i / 6) * 14}" width="9" height="9" fill="${col.l}" stroke="${col.d}" stroke-opacity=".2" transform="rotate(${(i * 23) % 45} ${154 + (i % 6) * 16} ${266 + Math.floor(i / 6) * 14})"/>`).join("")
    : /bhujia|mixture/i.test(p.name)
      ? Array.from({ length: 9 }, (_, i) => `<path d="M${148 + i * 12} ${300 - (i % 3) * 10} q 8 -22 18 -10" fill="none" stroke="${col.l}" stroke-width="6" stroke-linecap="round"/>`).join("")
      : powder
        ? `<path d="M140 304 q60 -64 120 0 z" fill="${col.l}"/>`
        : `<path d="M160 290 h80" stroke="${col.l}" stroke-width="10" stroke-linecap="round"/>`;
  return `${ground(240)}
  <path d="M96 64 h208 l6 16 l-6 10 l14 236 q2 18 -16 18 h-200 q-18 0 -16 -18 l14 -236 l-6 -10 z" fill="${col.c}"/>
  <rect x="96" y="64" width="208" height="16" fill="${col.d}" opacity=".5"/>
  ${label(p, col, 200, 112, { size: 26, width: 13 })}
  <ellipse cx="200" cy="284" rx="72" ry="38" fill="#FFFFFF" opacity=".92"/>
  ${contents}
  ${badge(p, col, 282, 330, 26)}`;
}

/** Bottle: ketchup, dishwash, floor, toilet, handwash, liquid detergent. */
function bottle(p: SeedProduct, col: Palette) {
  const pump = /handwash/i.test(p.name) && !/refill/i.test(p.name);
  const angled = /toilet/i.test(p.name);
  const cap = pump
    ? `<rect x="188" y="44" width="24" height="34" fill="#FFFFFF" stroke="${col.d}" stroke-width="3"/><path d="M196 44 v-14 h50 v12" fill="none" stroke="${col.d}" stroke-width="8" stroke-linecap="round"/>`
    : angled
      ? `<path d="M186 40 h28 v24 l26 -18 l8 10 l-34 28 h-28 z" fill="${col.d}"/>`
      : `<rect x="178" y="36" width="44" height="34" rx="6" fill="${col.d}"/>`;
  return `${ground(200)}
  ${cap}
  <path d="M176 70 h48 v20 q60 24 60 90 v150 q0 18 -18 18 h-132 q-18 0 -18 -18 v-150 q0 -66 60 -90 z" fill="${col.c}"/>
  <rect x="130" y="166" width="140" height="150" rx="10" fill="#FFFFFF" opacity=".95"/>
  ${label(p, col, 200, 192, { color: col.d, size: 22, width: 11 })}
  ${badge(p, col, 252, 314, 24)}`;
}

/** Wrapped bar: soaps, detergent bars, dishwash bars. */
function bar(p: SeedProduct, col: Palette) {
  const leaf = /neem|lime/i.test(p.name)
    ? `<path d="M290 262 q-36 -10 -40 -44 q34 4 40 44 z" fill="${col.l}"/><path d="M290 262 q-18 -18 -36 -40" stroke="${col.d}" stroke-width="2" fill="none"/>`
    : /dishwash/i.test(p.name)
      ? `<g fill="${col.l}"><circle cx="276" cy="232" r="10"/><circle cx="298" cy="244" r="7"/><circle cx="284" cy="258" r="5"/></g>`
      : `<path d="M262 252 q14 -24 30 -6 q14 16 -6 26 q-16 6 -24 -20" fill="none" stroke="${col.l}" stroke-width="6"/>`;
  return `${ground(300)}
  <path d="M64 168 l40 -40 h232 l-40 40 z" fill="${col.c}" opacity=".7"/>
  <path d="M296 168 l40 -40 v140 l-40 40 z" fill="${col.d}"/>
  <rect x="64" y="168" width="232" height="140" rx="8" fill="${col.c}"/>
  ${label(p, col, 162, 196, { size: 22, width: 14 })}
  ${leaf}
  ${badge(p, col, 112, 286, 22)}`;
}

function svgFor(p: SeedProduct): string {
  const col = COLORS[p.code] ?? { c: "#5E6661", d: "#222", l: "#EEE" };
  const body =
    p.art === "biscuit" || p.art === "noodles" ? flowWrap(p, col)
    : p.art === "box" || p.art === "tea" ? carton(p, col)
    : p.art === "bottle" && !/refill/i.test(p.name) ? bottle(p, col)
    : p.art === "bar" ? bar(p, col)
    : pouch(p, col);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#F5F4F1"/>${body}</svg>`;
}

async function main() {
  if (!CHROME) throw new Error("Google Chrome not found (set CHROME_PATH)");
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(path.join(tmpdir(), "packs-"));
  let total = 0;
  try {
    for (const p of PRODUCTS) {
      const html = path.join(tmp, `${p.code}.html`);
      const png = path.join(tmp, `${p.code}.png`);
      const webp = path.join(OUT, `${p.code.toLowerCase()}.webp`);
      writeFileSync(html, `<!doctype html><html><body style="margin:0">${svgFor(p)}</body></html>`);
      execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${SIZE},${SIZE}`, `--screenshot=${png}`, `file://${html}`], { stdio: "ignore" });
      await sharp(png).resize(THUMB, THUMB).webp({ quality: 78, effort: 6 }).toFile(webp);
      total += statSync(webp).size;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`${PRODUCTS.length} pack shots → web/public/products (${Math.round(total / 1024)} kB total, ${Math.round(total / PRODUCTS.length / 1024 * 10) / 10} kB each)`);
}

await main();
