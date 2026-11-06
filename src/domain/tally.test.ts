import { describe, expect, it } from "vitest";
import { buildCsv, buildTallyXml, escapeXml, gstSplit, type ExportOrder } from "./tally";

const order: ExportOrder = {
  number: 42,
  date: new Date("2026-11-06T20:30:00Z"), // 7 Nov 02:00 IST
  partyLedger: "Sharma & Sons Kirana (JBP-R-0001)",
  source: "APP",
  totalPaise: 816_480 + 1_161_769,
  lines: [
    { sku: "SKU-BS-075", itemName: "Glucose biscuit 75 g", cases: 10, freeCases: 1, casePricePaise: 77_760, grossPaise: 777_600, discountPaise: 0, taxablePaise: 777_600, gstRateBp: 500, gstPaise: 38_880 },
    { sku: "SKU-DT-1KG", itemName: "Detergent powder 1 kg", cases: 5, freeCases: 0, casePricePaise: 203_000, grossPaise: 1_015_000, discountPaise: 30_450, taxablePaise: 984_550, gstRateBp: 1800, gstPaise: 177_219 },
  ],
};

describe("Tally XML", () => {
  const xml = buildTallyXml([order]);

  it("escapes party names", () => {
    expect(xml).toContain("Sharma &amp; Sons Kirana (JBP-R-0001)");
    expect(xml).not.toContain("Sharma & Sons");
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;");
  });

  it("uses the India date and a stable voucher number", () => {
    expect(xml).toContain("<DATE>20261107</DATE>");
    expect(xml).toContain("<VOUCHERNUMBER>SO-000042</VOUCHERNUMBER>");
  });

  it("bills paid cases and ships paid + free", () => {
    expect(xml).toContain("<ACTUALQTY> 11 case</ACTUALQTY>");
    expect(xml).toContain("<BILLEDQTY> 10 case</BILLEDQTY>");
  });

  it("balances: party debit equals sales plus tax credits", () => {
    const amounts = [...xml.matchAll(/<LEDGERENTRIES\.LIST>[\s\S]*?<AMOUNT>(-?[\d.]+)<\/AMOUNT>/g)].map((m) => Math.round(Number(m[1]) * 100));
    const sales = [...xml.matchAll(/<ACCOUNTINGALLOCATIONS\.LIST>[\s\S]*?<AMOUNT>(-?[\d.]+)<\/AMOUNT>/g)].map((m) => Math.round(Number(m[1]) * 100));
    expect([...amounts, ...sales].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("splits GST into CGST and SGST halves that add up", () => {
    const split = gstSplit(order.lines);
    expect(split).toEqual([
      { rateBp: 500, cgstPaise: 19_440, sgstPaise: 19_440 },
      { rateBp: 1800, cgstPaise: 88_609, sgstPaise: 88_610 },
    ]);
  });
});

describe("CSV", () => {
  it("quotes commas and neutralises formulas", () => {
    const csv = buildCsv([{ ...order, partyLedger: "=HYPERLINK(\"x\"), shop" }]);
    expect(csv.split("\n")[1]).toContain(`"'=HYPERLINK(""x""), shop"`);
  });

  it("one row per line", () => {
    expect(buildCsv([order]).trim().split("\n")).toHaveLength(3);
  });
});
