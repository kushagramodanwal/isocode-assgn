const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** ₹7,776.00 */
export function rupees(paise: number): string {
  return inr.format(paise / 100);
}

/** ₹7,776 — for summaries where paise are noise */
export function rupeesShort(paise: number): string {
  return inr0.format(Math.round(paise / 100));
}

export function pct(bp: number): string {
  return `${(bp / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

/** ₹1,980 when there are no paise, ₹777.60 when there are: shorter lines on a 360px screen. */
export function rupeesCompact(paise: number): string {
  return paise % 100 === 0 ? inr0.format(paise / 100) : inr.format(paise / 100);
}
