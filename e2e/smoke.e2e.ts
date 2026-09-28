import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("playground lifecycle controls mount, pause, and destroy the effect", async ({ page }) => {
  await page.goto("/");
  const stage = page.getByTestId("playground-stage");
  await expect(stage).toBeVisible();
  await expect(page.getByTestId("api-code")).toContainText("createHolidayMode");

  await page.getByTestId("preset-select").selectOption("seollal");
  await page.getByTestId("effect-select").selectOption("confetti");
  await page.getByTestId("start-effect").click();
  await expect(stage.locator("[data-holiday-mode='true']")).toBeVisible();
  await expect(stage.locator(".hm-confetti span").first()).toBeVisible();

  await page.getByTestId("pause-effect").click();
  await expect(stage.locator("[data-holiday-mode='true']")).toHaveAttribute("data-status", "paused");

  await page.getByTestId("start-effect").click();
  await expect(stage.locator("[data-holiday-mode='true']")).toHaveAttribute("data-status", "running");

  await page.getByTestId("stop-effect").click();
  await expect(stage.locator("[data-holiday-mode='true']")).toHaveCount(0);
});

test("responsive layout has no horizontal overflow and captures screenshots", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByTestId("start-effect").click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-holiday-mode.png`), fullPage: true });
});

test("production preview has no detectable axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("reduced motion still renders a bounded lifecycle", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByTestId("effect-select").selectOption("confetti");
  await page.getByTestId("start-effect").click();
  const root = page.locator("[data-holiday-mode='true']");
  await expect(root).toHaveAttribute("data-reduced-motion", "true");
  const pieces = await root.locator(".hm-confetti span").count();
  expect(pieces).toBeGreaterThan(0);
  expect(pieces).toBeLessThan(16);
  await page.getByTestId("stop-effect").click();
  await expect(root).toHaveCount(0);
});
