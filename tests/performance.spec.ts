import { expect, test } from "@playwright/test";

const SHELL_TRANSFER_BUDGET = 3 * 1024 * 1024;
const SCENE_TRANSFER_BUDGET = 8 * 1024 * 1024;

test("meets the Orbit Atlas v1 performance budgets", async ({ page }) => {
  const navigationStart = Date.now();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Space map" })).toBeVisible();
  const uiReadyMs = Date.now() - navigationStart;
  await expect(page.locator(".scene-frame")).toHaveAttribute(
    "aria-busy",
    "false",
    {
      timeout: 5_000,
    },
  );
  const sceneReadyMs = Date.now() - navigationStart;

  const metrics = await page.evaluate(() => {
    const resources = performance
      .getEntriesByType("resource")
      .map((entry) => entry as PerformanceResourceTiming);
    const transferBytes = (entry: PerformanceResourceTiming): number =>
      entry.transferSize || entry.encodedBodySize || 0;
    const shellBytes = resources
      .filter((entry) => /\.(js|css)(\?|$)/.test(entry.name))
      .reduce((total, entry) => total + transferBytes(entry), 0);
    const sceneBytes = resources
      .filter((entry) => /\/data\//.test(entry.name))
      .reduce((total, entry) => total + transferBytes(entry), 0);
    return { shellBytes, sceneBytes };
  });

  const interaction = await page.evaluate(async () => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>(".scene-actions button")?.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return performance.now() - start;
  });

  const frameSample = await page.evaluate(
    () =>
      new Promise<{ frames: number; elapsedMs: number }>((resolve) => {
        const started = performance.now();
        let frames = 0;
        const tick = (now: number) => {
          frames += 1;
          if (now - started >= 1_000) {
            resolve({ frames, elapsedMs: now - started });
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  const fps = (frameSample.frames * 1_000) / frameSample.elapsedMs;

  console.log(
    JSON.stringify({
      shellBytes: metrics.shellBytes,
      sceneBytes: metrics.sceneBytes,
      uiReadyMs,
      sceneReadyMs,
      interactionMs: interaction,
      fps,
    }),
  );
  expect(metrics.shellBytes).toBeLessThanOrEqual(SHELL_TRANSFER_BUDGET);
  expect(metrics.sceneBytes).toBeLessThanOrEqual(SCENE_TRANSFER_BUDGET);
  expect(uiReadyMs).toBeLessThanOrEqual(2_500);
  expect(sceneReadyMs).toBeLessThanOrEqual(5_000);
  expect(interaction).toBeLessThan(100);
  expect(fps).toBeGreaterThanOrEqual(30);
});
