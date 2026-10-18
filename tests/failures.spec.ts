import { expect, test } from "@playwright/test";

test("isolates a missing object asset and keeps other objects usable", async ({
  page,
}) => {
  await page.goto("/?failObject=mars");
  await page.getByRole("searchbox", { name: "Search objects" }).fill("mars");
  const mars = page.getByRole("button", { name: "Mars, Planet" });
  await expect(mars).toBeDisabled();
  await expect(page.getByText("Motion asset missing")).toBeVisible();

  await page.getByRole("searchbox", { name: "Search objects" }).fill("terra");
  await page.getByRole("button", { name: "Earth, Planet" }).click();
  await expect(page.getByRole("heading", { name: "Earth" })).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Search objects" })
    .fill("no-match");
  await expect(page.getByText("No objects match")).toBeVisible();
});

test("explains missing WebGL 2 instead of mounting a broken canvas", async ({
  page,
}) => {
  await page.addInitScript(`
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (contextId, options) {
      if (contextId === "webgl2") return null;
      return originalGetContext.call(this, contextId, options);
    };
  `);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("WebGL 2 is unavailable");
  await expect(page.getByTestId("orbit-scene")).toHaveCount(0);
});
