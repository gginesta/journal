import { chromium, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const base = "http://127.0.0.1:3199";
const outDir = "/tmp/ux";
mkdirSync(outDir, { recursive: true });

const axeResults = {};

async function shot(page, name, fullPage = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
  console.log(`shot: ${name}`);
}

async function axe(page, name) {
  const results = await new AxeBuilder({ page }).analyze();
  axeResults[name] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
    sample: v.nodes[0]?.html?.slice(0, 160)
  }));
  console.log(`axe ${name}: ${results.violations.length} violation types`);
}

async function freshApp(page) {
  await page.goto(`${base}/app`);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

const browser = await chromium.launch();

// ---------- Mobile pass (primary persona: phone in the evening) ----------
const mobile = await browser.newContext({ ...devices["iPhone 13"] });
const m = await mobile.newPage();

await m.goto(`${base}/`, { waitUntil: "networkidle" });
await shot(m, "m01-homepage", true);
await axe(m, "homepage-mobile");

await m.goto(`${base}/login`, { waitUntil: "networkidle" });
await shot(m, "m02-login");
await axe(m, "login-mobile");

await freshApp(m);
await shot(m, "m03-onboarding-welcome");
await axe(m, "onboarding-welcome-mobile");

await m.getByRole("button", { name: "Continue" }).click();
await m.getByRole("heading", { name: "Who’s in your story?" }).waitFor();
await shot(m, "m04-onboarding-people-justme");
await m.getByRole("button", { name: "Family", exact: true }).click();
await m.getByLabel("Child", { exact: true }).fill("Leo");
await m.getByLabel("Partner").fill("Steph");
await shot(m, "m05-onboarding-people-family", true);
await axe(m, "onboarding-people-mobile");

await m.getByRole("button", { name: "Continue" }).click();
await m.getByRole("heading", { name: "When’s your moment?" }).waitFor();
await shot(m, "m06-onboarding-reminders", true);

await m.getByRole("button", { name: "Continue" }).click();
await m.getByRole("heading", { name: "How much journal do you want?" }).waitFor();
await shot(m, "m07-onboarding-payoff");

await m.getByRole("button", { name: "Start with tonight" }).click();
await m.getByRole("heading", { name: "What felt good today?" }).waitFor();
await shot(m, "m08-today-empty", true);
await axe(m, "today-empty-mobile");

await m.getByPlaceholder("A small good thing").fill("A sweet breakfast together in the kitchen");
await m.getByPlaceholder("A phrase, phase, favorite, or tiny milestone").fill("Asked for pancakes twice");
await m.getByLabel("Add little detail").click();
await shot(m, "m09-today-filled", true);
await axe(m, "today-filled-mobile");

await m.getByRole("button", { name: "Memories" }).first().click();
await m.getByRole("heading", { name: "Memories" }).waitFor();
await shot(m, "m10-memories", true);
await axe(m, "memories-mobile");

await m.getByRole("button", { name: "Calendar" }).first().click();
await m.getByRole("heading", { name: "Calendar" }).waitFor();
await shot(m, "m11-calendar", true);

await m.getByRole("button", { name: "Insights" }).first().click();
await shot(m, "m12-insights", true);

await m.getByRole("button", { name: "Settings" }).first().click();
await shot(m, "m13-settings", true);
await axe(m, "settings-mobile");

await mobile.close();

// ---------- Desktop pass ----------
const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const d = await desktop.newPage();

await d.goto(`${base}/`, { waitUntil: "networkidle" });
await shot(d, "d01-homepage", true);

await freshApp(d);
await shot(d, "d02-onboarding-welcome");
await d.getByRole("button", { name: "Continue" }).click();
await d.getByRole("heading", { name: "Who’s in your story?" }).waitFor();
await d.getByRole("button", { name: "Continue" }).click();
await d.getByRole("heading", { name: "When’s your moment?" }).waitFor();
await d.getByRole("button", { name: "Continue" }).click();
await d.getByRole("button", { name: "Start with tonight" }).click();
await d.getByRole("heading", { name: "What felt good today?" }).waitFor();
await shot(d, "d03-today-empty", true);

await d.getByPlaceholder("A small good thing").fill("Quiet coffee before everyone woke up");
await shot(d, "d04-today-filled");

await d.getByRole("button", { name: "Memories" }).first().click();
await d.getByRole("heading", { name: "Memories" }).waitFor();
await shot(d, "d05-memories");

// Entry detail modal from memories
const card = d.locator("article").filter({ hasText: "Quiet coffee" }).first();
if (await card.count()) {
  await card.click();
  await shot(d, "d06-entry-detail");
}

await desktop.close();
await browser.close();

writeFileSync(`${outDir}/axe-results.json`, JSON.stringify(axeResults, null, 2));
console.log("done");
