// Renders docs/TDD.html to docs/TDD.pdf with headless Chrome.
// Usage: GITHUB_URL=https://github.com/you/repo LIVE_URL=https://... node scripts/build-tdd.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));
if (!chrome) throw new Error("Chrome not found. Set CHROME_PATH.");

const github = process.env.GITHUB_URL || "(add the GitHub URL before submitting)";
const live = process.env.LIVE_URL ? `<a href="${process.env.LIVE_URL}">${process.env.LIVE_URL}</a>` : "Not deployed yet. Run locally with deployment.md.";
const src = readFileSync("docs/TDD.html", "utf8").replaceAll("__GITHUB_URL__", github).replace("__LIVE_URL__", live);
const tmp = path.resolve("docs/.tdd-render.html");
writeFileSync(tmp, src);
try {
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${path.resolve("docs/TDD.pdf")}`, `file://${tmp}`], { stdio: "inherit" });
} finally {
  rmSync(tmp, { force: true });
}
console.log("Wrote docs/TDD.pdf");
