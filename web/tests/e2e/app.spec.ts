import { expect, type Page, test } from "@playwright/test";

async function openFreshApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/app");
}

async function continueFromWelcome(page: Page) {
  await expect(page.getByRole("heading", { name: "This is a quiet place to keep one good moment from today." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "What kind of memories are you starting with?" })).toBeVisible();
}

async function startToday(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Today becomes something future-you can rediscover." })).toBeVisible();
  await page.getByRole("button", { name: "Start today" }).click();
  await expect(page.getByRole("heading", { name: "What felt good today?" })).toBeVisible();
}

test("demo user can complete family onboarding, edit today, and find the saved memory", async ({ page }) => {
  const response = "A sweet breakfast together in the kitchen";
  const person = "Grandma Test";
  const detail = "Asked for pancakes twice";

  await openFreshApp(page);
  await continueFromWelcome(page);
  await expect(page.getByRole("button", { name: "Just me", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Me and my partner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Other people or themes" })).toBeVisible();
  await expect(page.getByLabel("Partner")).toHaveCount(0);
  await page.getByRole("button", { name: "Family / kids" }).click();
  await page.getByLabel("Child", { exact: true }).fill("Leo Test");
  await page.getByLabel("Partner").fill("Steph Test");
  await expect(page.getByText("Still says 'lellow'")).toBeVisible();
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

test("demo user can choose just me and other onboarding shapes without family-only setup", async ({ page }) => {
  await openFreshApp(page);
  await continueFromWelcome(page);

  await expect(page.getByRole("button", { name: "Just me", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Family / kids" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Other people or themes" })).toBeVisible();
  await expect(page.getByLabel("Partner")).toHaveCount(0);

  await page.getByLabel("Me", { exact: true }).fill("Solo Tester");
  await startToday(page);
  await expect(page.getByRole("button", { name: "Solo Tester" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByRole("button", { name: "Replay welcome" }).click();
  await continueFromWelcome(page);
  await page.getByRole("button", { name: "Other people or themes" }).click();
  await expect(page.getByLabel("Me", { exact: true })).toHaveCount(0);
  await page.getByLabel("Person or theme", { exact: true }).fill("Travel Wins, Work Wins");
  await startToday(page);
  await expect(page.getByRole("button", { name: "Travel Wins" }).first()).toBeVisible();
});

test("details repository can find tagged little details when the repository UI is present", async ({ page }) => {
  const detail = "Blue door in Lisbon stayed bright";
  const tag = "Travel Wins";

  await openFreshApp(page);
  await continueFromWelcome(page);
  await page.getByRole("button", { name: "Other people or themes" }).click();
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
