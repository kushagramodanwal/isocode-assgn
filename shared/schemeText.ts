import type { Lang } from "./i18n";
import type { Slab } from "./pricing";

type S = { type: "FREE_GOODS" | "SLAB_DISCOUNT"; buyCases: number | null; freeCases: number | null; slabs: Slab[] };

export function schemeText(s: S, lang: Lang): string {
  if (s.type === "FREE_GOODS") {
    return lang === "hi" ? `${s.buyCases} पेटी पर ${s.freeCases} मुफ़्त` : `Buy ${s.buyCases} get ${s.freeCases} free`;
  }
  return [...s.slabs]
    .sort((a, b) => a.minCases - b.minCases)
    .map((x) => (lang === "hi" ? `${x.minCases}+ पेटी पर ${x.percentBp / 100}% छूट` : `${x.percentBp / 100}% off ${x.minCases}+ cases`))
    .join(" · ");
}
