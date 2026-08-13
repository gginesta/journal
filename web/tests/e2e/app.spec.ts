import { expect, type Page, test } from "@playwright/test";
import packageJson from "../../package.json";

test("public homepage presents the science-backed beta story", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Photo Gratitude Journal" })).toBeVisible();
  await expect(page.getByText("A private, photo-first ritual for noticing the good before it slips by.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the (demo|beta)/ }).first()).toHaveAttribute("href", "/app");
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute("href", "/login");

  await expect(page.getByRole("heading", { name: "Backed by practices researchers actually study." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gratitude practice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Savoring and noticing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Photos and memory" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reminiscence and retrieval" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Emmons & McCullough, 2003" })).toHaveAttribute("href", "https://pubmed.ncbi.nlm.nih.gov/12585811/");
  await expect(page.getByText("Not therapy, diagnosis, or medical advice")).toBeVisible();
});

test("public homepage fits on a phone viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Photo Gratitude Journal" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the (demo|beta)/ }).first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

async function openFreshApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/app");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function continueFromWelcome(page: Page) {
  await expect(page.getByRole("heading", { name: "A photo journal for noticing good moments" })).toBeVisible();
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("heading", { name: "Who’s in your story?" })).toBeVisible();
}

// Call this while on the "Who’s in your story?" (people) step to advance
// through the rhythm and mode steps and finish onboarding.
async function startToday(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "When’s your moment?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "How much journal do you want?" })).toBeVisible();
  await page.getByRole("button", { name: "Start with tonight" }).click();
  await expect(page.getByRole("heading", { name: "What felt good today?" })).toBeVisible();
}

test("demo user can complete family onboarding, edit today, and find the saved memory", async ({ page }) => {
  const response = "A sweet breakfast together in the kitchen";
  const person = "Grandma Test";
  const detail = "Asked for pancakes twice";

  await openFreshApp(page);
  await continueFromWelcome(page);
  await expect(page.getByRole("button", { name: "Just me", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Me + partner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My own mix" })).toBeVisible();
  await expect(page.getByLabel("Partner")).toHaveCount(0);
  await page.getByRole("button", { name: "Family", exact: true }).click();
  await page.getByLabel("Child", { exact: true }).fill("Leo Test");
  await page.getByLabel("Partner").fill("Steph Test");
  await startToday(page);

  await expect(page.getByRole("heading", { name: "Keep the first memory in under a minute." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Leo Test" }).first()).toBeVisible();
  await page.getByPlaceholder("A small good thing").fill(response);
  await page.getByPlaceholder("Add a private person").fill(person);
  await page.getByLabel("Add person").click();
  await expect(page.getByRole("button", { name: person, pressed: true })).toBeVisible();

  await page.getByPlaceholder("A phrase, phase, favorite, or tiny milestone").fill(detail);
  await page.getByLabel("Add little detail").click();
  const detailCard = page.locator("article").filter({ hasText: detail });
  await expect(detailCard).toBeVisible();
  await detailCard.getByRole("button", { name: person }).click();
  await expect(detailCard.getByRole("button", { name: person, pressed: true })).toBeVisible();

  await page.getByRole("button", { name: "Memories" }).first().click();
  await expect(page.getByRole("heading", { name: "Memories" })).toBeVisible();
  await page.getByPlaceholder("Search memories, people, prompts, or little details").fill("pancakes");
  const memoryCard = page.locator("article").filter({ hasText: response });
  await expect(memoryCard).toBeVisible();
  await expect(memoryCard.getByText(person)).toBeVisible();

  await page.getByRole("button", { name: "Calendar" }).first().click();
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
});

test("welcome tour fits on a phone viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFreshApp(page);

  await expect(page.getByRole("heading", { name: "A photo journal for noticing good moments" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip tour" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("demo user can choose just me and other onboarding shapes without family-only setup", async ({ page }) => {
  await openFreshApp(page);
  await continueFromWelcome(page);

  await expect(page.getByRole("button", { name: "Just me", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Family", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "My own mix" })).toBeVisible();
  await expect(page.getByLabel("Partner")).toHaveCount(0);

  await page.getByLabel("You", { exact: true }).fill("Solo Tester");
  await startToday(page);
  await expect(page.getByRole("button", { name: "Solo Tester" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).first().click();
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();
  await expect(page.getByText(`App version ${packageJson.version}`)).toBeVisible();
  await page.getByRole("button", { name: "Replay welcome" }).click();
  await continueFromWelcome(page);
  await page.getByRole("button", { name: "My own mix" }).click();
  await expect(page.getByLabel("You", { exact: true })).toHaveCount(0);
  await page.getByLabel("Person or theme", { exact: true }).fill("Travel Wins, Work Wins");
  await startToday(page);
  await expect(page.getByRole("button", { name: "Travel Wins" }).first()).toBeVisible();
});

test("onboarding rhythm step lets a demo user opt into a cadence", async ({ page }) => {
  await openFreshApp(page);
  await continueFromWelcome(page);
  await page.getByLabel("You", { exact: true }).fill("Cadence Tester");

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "When’s your moment?" })).toBeVisible();
  await page.getByRole("radio", { name: "Mornings and evenings" }).click();
  await expect(page.getByRole("radio", { name: "Mornings and evenings" })).toBeChecked();
  await page.getByRole("switch", { name: "Enable reminders" }).click();
  await expect(page.getByLabel("Morning", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Evening", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "How much journal do you want?" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Full/ })).toBeChecked();
  await page.getByRole("button", { name: "Start with tonight" }).click();
  await expect(page.getByRole("heading", { name: "What felt good today?" })).toBeVisible();
});

test("first personal memory gets a soft Memory Lane celebration", async ({ page }) => {
  const tinyPhoto = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7Q5YQAAAABJRU5ErkJggg==",
    "base64"
  );

  await openFreshApp(page);
  await page.getByRole("button", { name: "Skip tour" }).click();
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByRole("button", { name: "Add personal journal" }).click();
  await page.getByRole("button", { name: "Today" }).first().click();

  await page.getByLabel("Add journal photos").setInputFiles({
    name: "first-memory.png",
    mimeType: "image/png",
    buffer: tinyPhoto
  });
  await expect(page.getByRole("heading", { name: "This memory is now part of Memory Lane." })).toBeVisible();
  await expect(page.getByText("tomorrow, next week, or one month")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss first memory celebration" }).click();
  await expect(page.getByRole("heading", { name: "This memory is now part of Memory Lane." })).toHaveCount(0);
});

test("details repository can find tagged little details when the repository UI is present", async ({ page }) => {
  const detail = "Blue door in Lisbon stayed bright";
  const tag = "Travel Wins";

  await openFreshApp(page);
  await continueFromWelcome(page);
  await page.getByRole("button", { name: "My own mix" }).click();
  await page.getByLabel("Person or theme", { exact: true }).fill(tag);
  await startToday(page);

  await page.getByPlaceholder("A phrase, phase, favorite, or tiny milestone").fill(detail);
  await page.getByRole("button", { name: "Favorite" }).last().click();
  await page.getByLabel("Add little detail").click();
  const detailCard = page.locator("article").filter({ hasText: detail });
  await expect(detailCard).toBeVisible();
  await detailCard.getByRole("button", { name: tag }).click();
  await expect(detailCard.getByRole("button", { name: tag, pressed: true })).toBeVisible();

  await page.getByRole("button", { name: "Memories" }).first().click();
  await expect(page.getByRole("heading", { name: "Memories" })).toBeVisible();

  const repositoryControl = page.getByRole("button", { name: /Little Details|Details repository|Details/i }).first();
  test.skip((await repositoryControl.count()) === 0, "Little Details repository UI is not present in this build.");

  await repositoryControl.click();
  await page.getByPlaceholder(/Search.*details|Search.*little details/i).fill("Lisbon");
  await expect(page.getByText(detail)).toBeVisible();
  await page.getByRole("button", { name: tag }).first().click();
  await expect(page.getByText(detail)).toBeVisible();
});

test("photo polish lets a demo user caption a photo and use the pick-me-up memory", async ({ page }) => {
  const caption = "Sun on the test table";
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );

  await openFreshApp(page);
  await continueFromWelcome(page);
  await startToday(page);

  await page.locator('input[aria-label="Add journal photos"]').setInputFiles({
    name: "memory.png",
    mimeType: "image/png",
    buffer: tinyPng
  });
  await expect(page.getByText("Photo saved. Future-you gets a little more context.")).toBeVisible();
  await page.getByPlaceholder("What should this photo remember?").fill(caption);
  await expect(page.getByRole("heading", { name: caption })).toBeVisible();
  await expect(page.getByText("Photo day")).toBeVisible();
  await expect(page.getByText("1 caption")).toBeVisible();

  // On phone widths the look-back content sits behind the "More for today" disclosure.
  const moreForToday = page.getByRole("button", { name: /More for today/ });
  if (await moreForToday.isVisible()) {
    await moreForToday.click();
  }

  const pickMeUpCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Show me something good" }) });
  const pickMeUpButton = pickMeUpCard.getByRole("button").filter({ hasText: "A sunny park loop and a tiny hand holding mine." }).first();
  await expect(pickMeUpButton).toBeVisible();
  await pickMeUpButton.click();
  await expect(page.getByRole("heading", { name: "Memory from this day" })).toBeVisible();
  await page.getByRole("button", { name: "Close memory" }).click();

  await page.getByRole("button", { name: "Memories" }).first().click();
  await expect(page.locator("article").filter({ hasText: caption })).toBeVisible();
});

test("experience toggle switches Simple and Full without losing data", async ({ page }) => {
  const detail = "Tiny detail kept in Full";

  await openFreshApp(page);
  await page.getByRole("button", { name: "Skip tour" }).click();

  // The demo showcase starts in Full: the metadata surfaces are present and a
  // Little Detail can be saved before any switching.
  await expect(page.getByRole("heading", { name: "Mood, optional" })).toBeVisible();
  await page.getByPlaceholder("A phrase, phase, favorite, or tiny milestone").fill(detail);
  await page.getByLabel("Add little detail").click();
  await expect(page.locator("article").filter({ hasText: detail })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).first().click();
  await expect(page.getByRole("heading", { name: "How much journal do you want?" })).toBeVisible();
  await expect(page.getByText("Two ways to keep the same journal. Switch anytime — nothing is ever deleted, and everything you added stays saved and searchable.")).toBeVisible();
  await page.getByRole("radio", { name: /^Simple/ }).click();
  await expect(page.getByRole("radio", { name: /^Simple/ })).toBeChecked();

  // Simple: the analysis tabs disappear and customization sections hide.
  await expect(page.getByRole("button", { name: "Calendar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Insights", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Prompts", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "People Tags" })).toHaveCount(0);

  // Simple Today: ritual only — no mood picker, people tags, or Little Details.
  await page.getByRole("button", { name: "Today" }).first().click();
  await expect(page.getByRole("heading", { name: "What felt good today?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three nice things" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mood, optional" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "People, optional" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Little Details" })).toHaveCount(0);

  // Back to Full: everything returns, including the detail saved earlier.
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByRole("radio", { name: /^Full/ }).click();
  await expect(page.getByRole("radio", { name: /^Full/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Calendar", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Insights", exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Today" }).first().click();
  await expect(page.getByRole("heading", { name: "Mood, optional" })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: detail })).toBeVisible();
});

test("demo user can add and remove a photo without requiring reflection text", async ({ page }) => {
  const tinyPhoto = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7Q5YQAAAABJRU5ErkJggg==",
    "base64"
  );

  await openFreshApp(page);
  await continueFromWelcome(page);
  await startToday(page);

  await expect(page.getByRole("heading", { name: "Start with one photo, if one moment stands out." })).toBeVisible();
  await page.getByLabel("Add journal photos").setInputFiles({
    name: "one-good-moment.png",
    mimeType: "image/png",
    buffer: tinyPhoto
  });

  await expect(page.getByText("Photo saved. Future-you gets a little more context.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let the photo hold most of the story." })).toBeVisible();
  await expect(page.getByText(/1 photo.*saved/)).toBeVisible();

  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("heading", { name: "Start with one photo, if one moment stands out." })).toBeVisible();
  await expect(page.getByText("Photo removed. The entry is still yours to shape.")).toBeVisible();
});
