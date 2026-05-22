import { expect, test } from "@playwright/test";

test("demo user can edit today and find the saved memory", async ({ page }) => {
  const response = "A sweet breakfast together in the kitchen";
  const person = "Grandma Test";
  const detail = "Asked for pancakes twice";

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/app");

  await expect(page.getByRole("heading", { name: "What felt good today?" })).toBeVisible();
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
